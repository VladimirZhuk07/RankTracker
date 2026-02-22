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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, LoaderCircle } from "lucide-react";
import { checkUserExists } from '@/lib/actions';
import { CS2_MAPS } from '@/lib/storage/definitions';

export type ParsedUserData = {
  name: string;
  kills: number;
  deaths: number;
  damage: number;
  won: boolean;
  mapIndex: number;
  date: string; // ISO date string YYYY-MM-DD, defaults to today
  isExisting: boolean;
}

type CsvPreviewTableProps = {
  parsedData: ParsedUserData[];
  onConfirm: (editedData: ParsedUserData[]) => void;
  onCancel: () => void;
  isProcessing: boolean;
};

export function CsvPreviewTable({ parsedData, onConfirm, onCancel, isProcessing }: CsvPreviewTableProps) {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
  const [matchDate, setMatchDate] = useState<string>(parsedData[0]?.date ?? today);
  const [mapIndex, setMapIndex] = useState<number>(parsedData[0]?.mapIndex ?? 0);
  const [editedData, setEditedData] = useState<ParsedUserData[]>(parsedData);
  const [checkingNames, setCheckingNames] = useState<Set<number>>(new Set());

  useEffect(() => {
    setEditedData(parsedData);
    setMatchDate(parsedData[0]?.date ?? today);
    setMapIndex(parsedData[0]?.mapIndex ?? 0);
  }, [parsedData]);

  const handleMatchDateChange = (value: string) => {
    setMatchDate(value);
    setEditedData(prev => prev.map(row => ({ ...row, date: value })));
  };

  const handleMapChange = (value: string) => {
    const idx = parseInt(value, 10);
    setMapIndex(idx);
    setEditedData(prev => prev.map(row => ({ ...row, mapIndex: idx })));
  };

  const checkAndUpdateExistingStatus = useCallback(async (index: number, name: string) => {
    if (!name || name.trim() === '') return;

    setCheckingNames(prev => new Set(prev).add(index));
    try {
      const exists = await checkUserExists(name);
      setEditedData(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isExisting: exists };
        return updated;
      });
    } finally {
      setCheckingNames(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }, []);

  const updateName = (index: number, value: string) => {
    const updated = [...editedData];
    updated[index] = { ...updated[index], name: value };
    setEditedData(updated);
    setTimeout(() => checkAndUpdateExistingStatus(index, value), 500);
  };

  const updateStatField = (index: number, field: 'kills' | 'deaths' | 'damage', value: string) => {
    const updated = [...editedData];
    updated[index] = { ...updated[index], [field]: parseInt(value, 10) || 0 };
    setEditedData(updated);
  };

  const updateWon = (index: number, value: boolean) => {
    const updated = [...editedData];
    updated[index] = { ...updated[index], won: value };
    setEditedData(updated);
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
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Label htmlFor="match-date">Match date</Label>
          <Input
            id="match-date"
            type="date"
            value={matchDate}
            onChange={(e) => handleMatchDateChange(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="match-map">Map</Label>
          <Select value={String(mapIndex)} onValueChange={handleMapChange}>
            <SelectTrigger id="match-map" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CS2_MAPS.map((map, idx) => (
                <SelectItem key={map} value={String(idx)}>{map}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player Name</TableHead>
              <TableHead>Kills</TableHead>
              <TableHead>Deaths</TableHead>
              <TableHead>Damage</TableHead>
              <TableHead>Won</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editedData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={item.name}
                    onChange={(e) => updateName(index, e.target.value)}
                    className="w-full min-w-[120px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.kills}
                    onChange={(e) => updateStatField(index, 'kills', e.target.value)}
                    className="w-full min-w-[80px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.deaths}
                    onChange={(e) => updateStatField(index, 'deaths', e.target.value)}
                    className="w-full min-w-[80px]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.damage}
                    onChange={(e) => updateStatField(index, 'damage', e.target.value)}
                    className="w-full min-w-[100px]"
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={item.won}
                    onCheckedChange={(checked) => updateWon(index, checked)}
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
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={() => onConfirm(editedData)} disabled={isProcessing}>
          <Check className="mr-2 h-4 w-4" />
          {isProcessing ? 'Processing...' : 'Confirm & Save'}
        </Button>
      </div>
    </div>
  );
}
