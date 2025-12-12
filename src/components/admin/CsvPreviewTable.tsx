import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, LoaderCircle } from "lucide-react";
import { UserStatsData } from '@/lib/definitions';
import { checkUserExists } from '@/lib/actions';

export type ParsedUserData = {
  name: string;
  stats: UserStatsData;
  isExisting: boolean;
}

type CsvPreviewTableProps = {
  parsedData: ParsedUserData[];
  onConfirm: (editedData: ParsedUserData[]) => void;
  onCancel: () => void;
  isProcessing: boolean;
};

export function CsvPreviewTable({ parsedData, onConfirm, onCancel, isProcessing }: CsvPreviewTableProps) {
  const [editedData, setEditedData] = useState<ParsedUserData[]>(parsedData);
  const [checkingNames, setCheckingNames] = useState<Set<number>>(new Set());

  // Update edited data when parsedData changes
  useEffect(() => {
    setEditedData(parsedData);
  }, [parsedData]);

  const checkAndUpdateExistingStatus = useCallback(async (index: number, name: string) => {
    if (!name || name.trim() === '') {
      return;
    }

    setCheckingNames(prev => new Set(prev).add(index));
    try {
      const exists = await checkUserExists(name);
      setEditedData(prev => {
        const updated = [...prev];
        updated[index] = { 
          ...updated[index], 
          isExisting: exists 
        };
        return updated;
      });
    } catch (error) {
      console.error('Error checking user existence:', error);
    } finally {
      setCheckingNames(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }, []);

  const updateField = async (index: number, field: 'name' | 'totalMaps' | 'totalKills' | 'totalDeaths' | 'totalDamage', value: string | number) => {
    const updated = [...editedData];
    if (field === 'name') {
      updated[index] = { 
        ...updated[index], 
        name: value as string 
      };
      setEditedData(updated);
      // Check if user exists after a short delay to debounce
      const timeoutId = setTimeout(() => {
        checkAndUpdateExistingStatus(index, value as string);
      }, 500);
      
      // Cleanup function would be handled by React's effect cleanup if needed
    } else {
      updated[index] = {
        ...updated[index],
        stats: {
          ...updated[index].stats,
          [field]: typeof value === 'string' ? parseInt(value, 10) || 0 : value,
        },
      };
      setEditedData(updated);
    }
  };

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  if (!parsedData.length) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No valid data found to preview.</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player Name</TableHead>
              <TableHead>Maps</TableHead>
              <TableHead>Kills</TableHead>
              <TableHead>Deaths</TableHead>
              <TableHead>Damage</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editedData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={item.name}
                    onChange={(e) => updateField(index, 'name', e.target.value)}
                    className="w-full min-w-[120px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.stats.totalMaps}
                    onChange={(e) => updateField(index, 'totalMaps', e.target.value)}
                    className="w-full min-w-[80px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.stats.totalKills}
                    onChange={(e) => updateField(index, 'totalKills', e.target.value)}
                    className="w-full min-w-[80px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.stats.totalDeaths}
                    onChange={(e) => updateField(index, 'totalDeaths', e.target.value)}
                    className="w-full min-w-[80px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.stats.totalDamage}
                    onChange={(e) => updateField(index, 'totalDamage', e.target.value)}
                    className="w-full min-w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  {checkingNames.has(index) ? (
                    <span className="inline-flex items-center text-muted-foreground">
                      <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
                      Checking...
                    </span>
                  ) : item.isExisting ? (
                    <span className="inline-flex items-center text-amber-600">
                      <Check className="mr-1 h-4 w-4" />
                      Update
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-green-600">
                      <Check className="mr-1 h-4 w-4" />
                      New
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isProcessing}
        >
          <Check className="mr-2 h-4 w-4" />
          {isProcessing ? 'Processing...' : 'Confirm & Save'}
        </Button>
      </div>
    </div>
  );
}