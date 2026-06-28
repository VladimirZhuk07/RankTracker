'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import type { MatchRecord, SessionRecord, User } from '@/lib/storage/definitions';
import { CS2_MAPS } from '@/lib/storage/definitions';
import { getNeutralSessionIds } from '@/lib/neutral-sessions';
import { previewCsvFile, previewCsvText, previewImageFile } from '@/lib/preview-actions';
import { CsvPreviewTable, ParsedUserData } from '@/components/admin/CsvPreviewTable';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  createUser,
  updateUser,
  updateRatingsFromCSV,
  updateRatingsFromCsvText,
  updateRatingsFromParsedData,
  deleteUser,
  updateMatch,
  deleteMatch,
  updateSession,
  deleteSession,
} from '@/lib/actions';
import { Edit, UserPlus, AlertCircle, Trash2, LoaderCircle, Save, History } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon } from '@/components/UserIcon';
import { useFirebase } from '@/firebase';
import { useCollection } from '@/firebase';
import { getUsersQuery, getMatchesQuery, getSessionsQuery } from '@/lib/storage/queries';
import { Textarea } from '../ui/textarea';
import { MANUAL_ASSIGNABLE_ACHIEVEMENTS } from '@/lib/achievements-i18n';

const initialCreateUserState = {
  message: '',
  user: null,
  error: false,
};

function CreateUserForm() {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(createUser, initialCreateUserState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) {
      if (state.user && !state.error) {
        toast({ title: 'Success', description: state.message });
        formRef.current?.reset();
      } else if (state.error) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
      }
    }
  }, [state, toast]);

  return (
    <Card>
      <form action={formAction} ref={formRef}>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>Add a new player to the leaderboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name</Label>
            <Input id="name" name="name" placeholder="e.g., ZywOo" required />
          </div>
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <CreateUserButton />
        </CardFooter>
      </form>
    </Card>
  );
}

function CreateUserButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      <UserPlus className="mr-2 h-4 w-4" />
      {pending ? 'Creating...' : 'Create User'}
    </Button>
  );
}

export function AdminDashboardClient() {
  const { firestore } = useFirebase();
  const [isMounted, setIsMounted] = useState(false);

  const usersQuery = React.useMemo(() => {
    if (!firestore) return null;
    return getUsersQuery(firestore);
  }, [firestore]);

  const matchesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return getMatchesQuery(firestore);
  }, [firestore]);

  const sessionsQuery = React.useMemo(() => {
    if (!firestore) return null;
    return getSessionsQuery(firestore);
  }, [firestore]);

  const { data: usersData, loading: usersLoading } = useCollection(usersQuery);
  const { data: matchesData, loading: matchesLoading } = useCollection(matchesQuery);
  const { data: sessionsData, loading: sessionsLoading } = useCollection(sessionsQuery);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="py-6 flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const users = (usersData as User[]) ?? [];
  const matches = (matchesData as MatchRecord[]) ?? [];
  const sessions = (sessionsData as SessionRecord[]) ?? [];

  const usersById = users.reduce<Record<string, User>>((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {});

  const sessionsById = sessions.reduce<Record<string, SessionRecord>>((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  return (
    <div className="py-6">
      <Tabs defaultValue="manage-users">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="manage-users">Manage Users</TabsTrigger>
          <TabsTrigger value="upload-csv">Upload Stats</TabsTrigger>
          <TabsTrigger value="match-history">Match History</TabsTrigger>
        </TabsList>
        <TabsContent value="manage-users">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <div className="lg:col-span-1">
              <CreateUserForm />
            </div>
            <div className="lg:col-span-2">
              <UsersTable users={users} loading={usersLoading} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="upload-csv">
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <CsvUploadForm />
            <CsvPasteForm />
          </div>
        </TabsContent>
        <TabsContent value="match-history">
          <div className="mt-4">
            <MatchHistoryTable
              matches={matches}
              usersById={usersById}
              sessionsById={sessionsById}
              loading={matchesLoading || sessionsLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const initialCsvUploadState = {
  success: false,
  message: '',
  users: [],
};

function CsvUploadForm() {
  const { toast } = useToast();
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'image' | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(updateRatingsFromCSV, initialCsvUploadState);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedUserData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setFileType('csv');
      } else if (file.type.startsWith('image/')) {
        setFileType('image');
      } else {
        setFileType(null);
      }
    } else {
      setFileName('');
      setFileType(null);
    }
  };

  const handlePreview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    try {
      setIsProcessing(true);

      let result;
      if (fileType === 'csv') {
        result = await previewCsvFile(formData);
      } else if (fileType === 'image') {
        const file = formData.get('file-upload') as File;
        const imageFormData = new FormData();
        imageFormData.append('image-file', file);
        result = await previewImageFile(imageFormData);
      } else {
        throw new Error('Unsupported file type');
      }

      if (result.success && result.data) {
        setPreviewData(result.data);
        setIsPreviewMode(true);
        toast({
          title: fileType === 'csv' ? 'CSV Parsed' : 'Image Analyzed',
          description: result.message,
        });
      } else {
        toast({ variant: 'destructive', title: 'Preview Failed', description: result.message });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Preview Failed',
        description: error instanceof Error ? error.message : 'An error occurred while processing the file.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (editedData: ParsedUserData[]) => {
    try {
      setIsProcessing(true);
      const result = await updateRatingsFromParsedData(editedData);

      if (result?.success) {
        toast({ title: 'Upload Successful', description: result.message });
        formRef.current?.reset();
        setFileName('');
        setIsPreviewMode(false);
        setPreviewData([]);
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: result.message || 'Failed to process file.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'An error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsPreviewMode(false);
    setPreviewData([]);
  };

  useEffect(() => {
    if (state?.message && !isPreviewMode) {
      if (state.success) {
        toast({ title: 'Upload Successful', description: state.message });
        formRef.current?.reset();
        setFileName('');
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: state.message });
      }
    }
  }, [state, toast, isPreviewMode]);

  return (
    <Card>
      {!isPreviewMode ? (
        <form onSubmit={handlePreview} ref={formRef}>
          <CardHeader>
            <CardTitle>Upload from File</CardTitle>
            <CardDescription>
              Upload a CSV file (format: name,kills,deaths,damage[,true/false]) or an image of CS2 stats table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="file-upload">CSV or Image File</Label>
            <Input
              id="file-upload"
              name="file-upload"
              type="file"
              required
              accept=".csv,image/*"
              onChange={handleFileChange}
            />
            {fileName && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">Selected: {fileName}</p>
                {fileType === 'image' && (
                  <p className="text-sm text-blue-600">
                    Image will be analyzed using AI (rate limited to 1 request per 10 seconds)
                  </p>
                )}
                {fileType === 'csv' && (
                  <p className="text-sm text-green-600">CSV file will be parsed directly</p>
                )}
                {fileType === null && fileName && (
                  <p className="text-sm text-red-600">Unsupported file type. Please upload a CSV or image file.</p>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isProcessing || !fileType}>
              {isProcessing
                ? fileType === 'image' ? 'Analyzing Image...' : 'Processing...'
                : 'Preview Data'}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <div>
          <CardHeader>
            <CardTitle>Preview Data</CardTitle>
            <CardDescription>
              Review the data before saving. {previewData.length} valid entries found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvPreviewTable
              parsedData={previewData}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />
          </CardContent>
        </div>
      )}
    </Card>
  );
}

function CsvPasteForm() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(updateRatingsFromCsvText, initialCsvUploadState);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedUserData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePreview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);

    try {
      setIsProcessing(true);
      const result = await previewCsvText(formData);

      if (result.success && result.data) {
        setPreviewData(result.data);
        setIsPreviewMode(true);
        toast({ title: 'CSV Parsed', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Preview Failed', description: result.message });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Preview Failed', description: 'An error occurred while processing the CSV text.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (editedData: ParsedUserData[]) => {
    try {
      setIsProcessing(true);
      const result = await updateRatingsFromParsedData(editedData);

      if (result?.success) {
        toast({ title: 'Update Successful', description: result.message });
        formRef.current?.reset();
        setIsPreviewMode(false);
        setPreviewData([]);
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: result.message || 'Failed to process CSV text.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'An error occurred.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsPreviewMode(false);
    setPreviewData([]);
  };

  useEffect(() => {
    if (state?.message && !isPreviewMode) {
      if (state.success) {
        toast({ title: 'Update Successful', description: state.message });
        formRef.current?.reset();
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: state.message });
      }
    }
  }, [state, toast, isPreviewMode]);

  return (
    <Card>
      {!isPreviewMode ? (
        <form onSubmit={handlePreview} ref={formRef}>
          <CardHeader>
            <CardTitle>Paste CSV Content</CardTitle>
            <CardDescription>Update stats by pasting content. Format: name,kills,deaths,damage[,true/false]</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="csv-text">CSV Content</Label>
            <Textarea
              id="csv-text"
              name="csv-text"
              required
              rows={5}
              placeholder={'player1,20,15,2150,true\nplayer2,15,10,3120,false\nplayer3,10,20,2410'}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Preview Data'}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <div>
          <CardHeader>
            <CardTitle>Preview Data</CardTitle>
            <CardDescription>
              Review the data before saving. {previewData.length} valid entries found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvPreviewTable
              parsedData={previewData}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />
          </CardContent>
        </div>
      )}
    </Card>
  );
}

function UsersTable({ users, loading }: { users: User[]; loading: boolean }) {
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    const result = await deleteUser(userToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: 'Success', description: 'User deleted successfully.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to delete user.' });
    }
    setUserToDelete(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current Users</CardTitle>
          <CardDescription>View and manage all registered players.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    <div className="flex items-center justify-center py-8">
                      <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-4">Loading Users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                            <UserIcon />
                          </div>
                        )}
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <EditUserDialog user={user} />
                    <Button variant="destructive" size="sm" onClick={() => setUserToDelete(user)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete User</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user "{userToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const initialUpdateUserState = {
  success: false,
  message: '',
  user: null,
};

function EditUserDialog({ user }: { user: User }) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(updateUser, initialUpdateUserState);
  const formRef = useRef<HTMLFormElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (state?.message) {
      if (state.success && state.user) {
        toast({ title: 'Success', description: 'User updated successfully.' });
        formRef.current?.reset();
        setAvatarPreview(null);
      } else if (!state.success) {
        toast({ variant: 'destructive', title: 'Error', description: state.message });
      }
    }
  }, [state, toast]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  return (
    <Dialog onOpenChange={() => setAvatarPreview(null)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit User</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} ref={formRef}>
          <DialogHeader>
            <DialogTitle>Edit User: {user.name}</DialogTitle>
            <DialogDescription>Update the player's name and avatar.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Player Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar Image</Label>
              <div className="flex items-center gap-4 mt-2">
                <Avatar className="h-16 w-16">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt={user.name} />
                  ) : user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                      <UserIcon />
                    </div>
                  )}
                </Avatar>
                <Input id="avatar" name="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>
            {MANUAL_ASSIGNABLE_ACHIEVEMENTS.length > 0 && (
              <div className="space-y-2">
                <Label>Manual achievements</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {MANUAL_ASSIGNABLE_ACHIEVEMENTS.map((achievement) => (
                    <label
                      key={achievement.id}
                      htmlFor={`manual-${achievement.id}-${user.id}`}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        id={`manual-${achievement.id}-${user.id}`}
                        name="manualAchievementIds"
                        value={achievement.id}
                        defaultChecked={user.manualAchievementIds?.includes(achievement.id)}
                        className="h-4 w-4 shrink-0 rounded border border-primary"
                      />
                      <img
                        src={`/achievements/${achievement.iconPath}`}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0 rounded object-contain"
                      />
                      <span className="text-sm">{achievement.nameEn}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <input type="hidden" name="userId" value={user.id} />
          </div>
          <DialogFooter>
            <EditUserButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save changes'}
    </Button>
  );
}

type EditableMatchRow = MatchRecord & { isEditing: boolean; editKills: number; editDeaths: number; editDamage: number; editWon: boolean };

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString('en-GB', opts)} – ${weekEnd.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`;
}

function tsToDateInput(ts: any): string {
  if (!ts) return '';
  const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

/** Normalize Firestore/storage won field to boolean so Switch and neutral logic are consistent. */
function normalizeWon(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

function MatchHistoryTable({
  matches,
  usersById,
  sessionsById,
  loading,
}: {
  matches: MatchRecord[];
  usersById: Record<string, User>;
  sessionsById: Record<string, SessionRecord>;
  loading: boolean;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<EditableMatchRow[]>([]);
  const [matchToDelete, setMatchToDelete] = useState<MatchRecord | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ sessionId: string; playerCount: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingSessionIds, setSavingSessionIds] = useState<Set<string>>(new Set());
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [neutralSessionIds, setNeutralSessionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setNeutralSessionIds(getNeutralSessionIds(matches));

    setRows(
      matches.map((m) => {
        const won = normalizeWon(m.won);
        return {
          ...m,
          won,
          isEditing: false,
          editKills: m.kills,
          editDeaths: m.deaths,
          editDamage: m.damage,
          editWon: won,
        };
      })
    );
  }, [matches]);

  const weekEnd = getWeekEnd(weekStart);

  const getMatchDate = (match: MatchRecord): Date => {
    const ts = match.date as any;
    return ts?.toDate ? ts.toDate() : new Date(ts);
  };

  const weekRows = rows.filter((row) => {
    if (!row.date) return false;
    const d = getMatchDate(row);
    return d >= weekStart && d <= weekEnd;
  });

  const goToPrevWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  const startEdit = (matchId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === matchId ? { ...r, isEditing: true } : r))
    );
  };

  const cancelEdit = (matchId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === matchId
          ? { ...r, isEditing: false, editKills: r.kills, editDeaths: r.deaths, editDamage: r.damage, editWon: r.won }
          : r
      )
    );
  };

  const updateField = (matchId: string, field: 'editKills' | 'editDeaths' | 'editDamage', value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === matchId ? { ...r, [field]: parseInt(value, 10) || 0 } : r))
    );
  };

  const updateWon = (matchId: string, value: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === matchId ? { ...r, editWon: value } : r))
    );
  };

  const handleSave = async (row: EditableMatchRow) => {
    setSavingIds((prev) => new Set(prev).add(row.id));
    const result = await updateMatch(row.id, {
      kills: row.editKills,
      deaths: row.editDeaths,
      damage: row.editDamage,
      won: row.editWon,
    });
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });

    if (result.success) {
      toast({ title: 'Match updated.' });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, isEditing: false, kills: row.editKills, deaths: row.editDeaths, damage: row.editDamage, won: row.editWon }
            : r
        )
      );
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleSessionMapChange = async (sessionId: string, value: string) => {
    setSavingSessionIds((prev) => new Set(prev).add(sessionId));
    const result = await updateSession(sessionId, parseInt(value, 10), undefined);
    setSavingSessionIds((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleSessionDateChange = async (sessionId: string, date: string) => {
    if (!date) return;
    setSavingSessionIds((prev) => new Set(prev).add(sessionId));
    const result = await updateSession(sessionId, undefined, date);
    setSavingSessionIds((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!matchToDelete) return;
    setIsDeleting(true);
    const result = await deleteMatch(matchToDelete.id);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: 'Match deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setMatchToDelete(null);
  };

  const handleSessionDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);
    const result = await deleteSession(sessionToDelete.sessionId);
    setIsDeletingSession(false);
    if (result.success) {
      toast({ title: 'Session deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setSessionToDelete(null);
  };

  const getDateLabel = (match: MatchRecord): string => {
    if (!match.date) return '—';
    const ts = match.date as any;
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getCreatedAtLabel = (match: MatchRecord): string => {
    if (!match.createdAt) return '';
    const ts = match.createdAt as any;
    const date: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const groupedRows = weekRows.reduce<{ sessionId: string; dateLabel: string; createdAtLabel: string; rows: EditableMatchRow[] }[]>((acc, row) => {
    const sessionId = row.sessionId ?? row.id;
    const existing = acc.find(g => g.sessionId === sessionId);
    if (existing) {
      existing.rows.push(row);
    } else {
      acc.push({ sessionId, dateLabel: getDateLabel(row), createdAtLabel: getCreatedAtLabel(row), rows: [row] });
    }
    return acc;
  }, []).map(group => ({
    ...group,
    rows: [...group.rows].sort((a, b) => {
      if (a.won !== b.won) return a.won ? -1 : 1; // W before L
      return b.damage - a.damage; // higher damage first within each group
    }),
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Match History
          </CardTitle>
          <CardDescription>View and correct individual match records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={goToPrevWeek}>
              ←
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatWeekLabel(weekStart)}</span>
              {!isCurrentWeek && (
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
                  Today
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={goToNextWeek} disabled={isCurrentWeek}>
              →
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-4">Loading matches...</span>
            </div>
          )}
          {!loading && weekRows.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">
              No matches for this week.
            </p>
          )}
          {!loading && groupedRows.map(({ sessionId, dateLabel, createdAtLabel, rows: groupRows }) => {
            const session = sessionsById[sessionId];
            const currentMapIndex = session?.mapIndex ?? 0;
            const isSavingSession = savingSessionIds.has(sessionId);
            return (
            <div key={sessionId} className="mb-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Input
                  type="date"
                  value={tsToDateInput(session?.date)}
                  onChange={(e) => handleSessionDateChange(sessionId, e.target.value)}
                  disabled={isSavingSession}
                  className="h-7 text-xs w-[140px] font-semibold"
                />
                {createdAtLabel && (
                  <span className="text-xs text-muted-foreground">uploaded {createdAtLabel}</span>
                )}
                <div className="flex-1 h-px bg-border" />
                {isSavingSession && <LoaderCircle className="h-3 w-3 animate-spin text-muted-foreground" />}
                <Select
                  value={String(currentMapIndex)}
                  onValueChange={(v) => handleSessionMapChange(sessionId, v)}
                  disabled={isSavingSession}
                >
                  <SelectTrigger className="h-7 text-xs w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CS2_MAPS.map((map, idx) => (
                      <SelectItem key={map} value={String(idx)} className="text-xs">{map}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">{groupRows.length} player{groupRows.length !== 1 ? 's' : ''}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setSessionToDelete({ sessionId, playerCount: groupRows.length })}
                  disabled={isSavingSession}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete session</span>
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Kills</TableHead>
                    <TableHead>Deaths</TableHead>
                    <TableHead>Damage</TableHead>
                    <TableHead>Won</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            {usersById[row.userId]?.avatarUrl ? (
                              <AvatarImage src={usersById[row.userId].avatarUrl} alt={usersById[row.userId].name} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                                <UserIcon />
                              </div>
                            )}
                          </Avatar>
                          <span className="font-medium">{usersById[row.userId]?.name ?? row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.isEditing ? (
                          <Input
                            type="number"
                            value={row.editKills}
                            onChange={(e) => updateField(row.id, 'editKills', e.target.value)}
                            className="w-20"
                          />
                        ) : row.kills}
                      </TableCell>
                      <TableCell>
                        {row.isEditing ? (
                          <Input
                            type="number"
                            value={row.editDeaths}
                            onChange={(e) => updateField(row.id, 'editDeaths', e.target.value)}
                            className="w-20"
                          />
                        ) : row.deaths}
                      </TableCell>
                      <TableCell>
                        {row.isEditing ? (
                          <Input
                            type="number"
                            value={row.editDamage}
                            onChange={(e) => updateField(row.id, 'editDamage', e.target.value)}
                            className="w-24"
                          />
                        ) : row.damage}
                      </TableCell>
                      <TableCell>
                        {row.isEditing ? (
                          <Switch
                            checked={row.editWon === true}
                            onCheckedChange={(checked) => updateWon(row.id, checked)}
                          />
                        ) : (
                          (() => {
                            const neutralKey = row.sessionId ?? row.id;
                            const isNeutral = neutralSessionIds.has(neutralKey);
                            return (
                              <span
                                className={
                                  isNeutral
                                    ? 'text-blue-600 font-medium'
                                    : row.won
                                      ? 'text-green-600 font-medium'
                                      : 'text-muted-foreground'
                                }
                              >
                                {isNeutral ? 'N' : row.won ? 'W' : 'L'}
                              </span>
                            );
                          })()
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {row.isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(row)}
                              disabled={savingIds.has(row.id)}
                            >
                              <Save className="h-4 w-4" />
                              <span className="sr-only">Save</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancelEdit(row.id)}
                              disabled={savingIds.has(row.id)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(row.id)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setMatchToDelete(row)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );})}
        </CardContent>
      </Card>

      <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this match?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the match record for "{matchToDelete ? (usersById[matchToDelete.userId]?.name ?? matchToDelete.name) : ''}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all {sessionToDelete?.playerCount} match record{sessionToDelete?.playerCount !== 1 ? 's' : ''} in this session. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSessionDeleteConfirm} disabled={isDeletingSession}>
              {isDeletingSession ? 'Deleting...' : 'Delete session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
