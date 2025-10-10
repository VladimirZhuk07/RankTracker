'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { getRatingsCSV } from '@/lib/actions';
import type { User } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';

type RankedUser = User & { rating: number; rank: number; kdRatio: number; averageDamage: number; };

export function DownloadRatingsButton({ users }: { users: RankedUser[] }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const csvData = await getRatingsCSV(users);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'player-rankings.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({
                title: 'Download Started',
                description: 'Your CSV file is being downloaded.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not generate the CSV file.',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Button onClick={handleDownload} disabled={isDownloading} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Downloading...' : 'Download CSV'}
        </Button>
    );
}
