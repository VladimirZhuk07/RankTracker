'use client';

import React, { useState, useEffect, useRef, useActionState, use } from 'react';
import type { User } from '@/lib/definitions';
import { previewCsvFile, previewCsvText } from '@/lib/preview-actions';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  createUser,
  updateUser,
  updateRatingsFromCSV,
  updateRatingsFromCsvText,
  updateRatingsFromParsedData,
  deleteUser,
} from '@/lib/actions';
import { Edit, UserPlus, Upload, AlertCircle, Trash2, LoaderCircle, ClipboardPaste } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserIcon } from '@/components/UserIcon';
import { calculateStats } from '@/lib/calculations';
import { useFirebase } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Textarea } from '../ui/textarea';


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
                toast({
                    title: 'Success',
                    description: state.message,
                });
                formRef.current?.reset();
                state.message = '';
                state.user = null;
                state.error = false;
            } else if (state.error) {
                toast({
                    variant: "destructive",
                    title: 'Error',
                    description: state.message,
                });
                state.message = '';
                state.error = false;
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
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                        <Label htmlFor="name">Player Name</Label>
                        <Input id="name" name="name" placeholder="e.g., ZywOo" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="totalMaps">Maps Played</Label>
                        <Input id="totalMaps" name="totalMaps" type="number" placeholder="e.g., 10" required defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="totalKills">Kills</Label>
                        <Input id="totalKills" name="totalKills" type="number" placeholder="e.g., 150" required defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="totalDeaths">Deaths</Label>
                        <Input id="totalDeaths" name="totalDeaths" type="number" placeholder="e.g., 120" required defaultValue="0" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="totalDamage">Damage</Label>
                        <Input id="totalDamage" name="totalDamage" type="number" placeholder="e.g., 18000" required defaultValue="0" />
                    </div>
                    {state?.error && (
                         <div className="col-span-2">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        </div>
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

  const usersQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, loading } = useCollection(usersQuery);

  return (
    <div className="py-6">
      <Tabs defaultValue="manage-users">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="manage-users">Manage Users</TabsTrigger>
          <TabsTrigger value="upload-csv">Upload Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="manage-users">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <div className="lg:col-span-1">
                <CreateUserForm />
            </div>
            <div className="lg:col-span-2">
                <UsersTable users={users as User[] || []} loading={loading} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="upload-csv">
            <div className="mt-4 grid gap-6 md:grid-cols-2">
                <CsvUploadForm />
                <CsvPasteForm />
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
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateRatingsFromCSV, initialCsvUploadState);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [previewData, setPreviewData] = useState<ParsedUserData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const formDataRef = useRef<FormData | null>(null);

    // Process the preview
    const handlePreview = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formRef.current) return;
        
        const formData = new FormData(formRef.current);
        formDataRef.current = formData;
        
        try {
            setIsProcessing(true);
            const result = await previewCsvFile(formData);
            
            if (result.success && result.data) {
                setPreviewData(result.data);
                setIsPreviewMode(true);
                toast({
                    title: 'CSV Parsed',
                    description: result.message,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Preview Failed',
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Preview Failed',
                description: 'An error occurred while processing the CSV file.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle final submission after preview confirmation
    const handleConfirm = async (editedData: ParsedUserData[]) => {
        try {
            setIsProcessing(true);
            const result = await updateRatingsFromParsedData(editedData);
            
            if (result?.success) {
                toast({
                    title: 'Upload Successful',
                    description: result.message,
                });
                formRef.current?.reset();
                setFileName('');
                setIsPreviewMode(false);
                setPreviewData([]);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: result.message || 'Failed to process CSV file.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: 'An error occurred while processing the CSV file.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Cancel preview mode
    const handleCancel = () => {
        setIsPreviewMode(false);
        setPreviewData([]);
    };

    useEffect(() => {
        if (state?.message && !isPreviewMode) {
            if (state.success) {
                toast({
                    title: 'Upload Successful',
                    description: state.message,
                });
                formRef.current?.reset();
                setFileName('');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, isPreviewMode]);

    return (
        <Card>
            {!isPreviewMode ? (
                <form onSubmit={handlePreview} ref={formRef}>
                    <CardHeader>
                        <CardTitle>Upload from File</CardTitle>
                        <CardDescription>Update stats from a CSV file. Format: name,maps,kills,deaths,damage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input 
                            id="csv-file" 
                            name="csv-file" 
                            type="file" 
                            required 
                            accept=".csv" 
                            onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                        />
                        {fileName && <p className="mt-2 text-sm text-muted-foreground">Selected: {fileName}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={isProcessing}
                        >
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

function CsvUploadButton() {
    const { pending } = useFormStatus();
    return (
         <Button type="submit" className="w-full" disabled={pending}>
            <Upload className="mr-2 h-4 w-4"/>
            {pending ? 'Uploading...' : 'Upload and Update Stats'}
        </Button>
    )
}

function CsvPasteForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(updateRatingsFromCsvText, initialCsvUploadState);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [previewData, setPreviewData] = useState<ParsedUserData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const formDataRef = useRef<FormData | null>(null);

    // Process the preview
    const handlePreview = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formRef.current) return;
        
        const formData = new FormData(formRef.current);
        formDataRef.current = formData;
        
        try {
            setIsProcessing(true);
            const result = await previewCsvText(formData);
            
            if (result.success && result.data) {
                setPreviewData(result.data);
                setIsPreviewMode(true);
                toast({
                    title: 'CSV Parsed',
                    description: result.message,
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Preview Failed',
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Preview Failed',
                description: 'An error occurred while processing the CSV text.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle final submission after preview confirmation
    const handleConfirm = async (editedData: ParsedUserData[]) => {
        try {
            setIsProcessing(true);
            const result = await updateRatingsFromParsedData(editedData);
            
            if (result?.success) {
                toast({
                    title: 'Update Successful',
                    description: result.message,
                });
                formRef.current?.reset();
                setIsPreviewMode(false);
                setPreviewData([]);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: result.message || 'Failed to process CSV text.',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'An error occurred while processing the CSV text.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Cancel preview mode
    const handleCancel = () => {
        setIsPreviewMode(false);
        setPreviewData([]);
    };

    useEffect(() => {
        if (state?.message && !isPreviewMode) {
            if (state.success) {
                toast({
                    title: 'Update Successful',
                    description: state.message,
                });
                formRef.current?.reset();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: state.message,
                });
            }
        }
    }, [state, toast, isPreviewMode]);

    return (
        <Card>
            {!isPreviewMode ? (
                <form onSubmit={handlePreview} ref={formRef}>
                    <CardHeader>
                        <CardTitle>Paste CSV Content</CardTitle>
                        <CardDescription>Update stats by pasting content. Format: name,maps,kills,deaths,damage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="csv-text">CSV Content</Label>
                        <Textarea 
                            id="csv-text" 
                            name="csv-text" 
                            required 
                            rows={5}
                            placeholder="player1,15,20,15,2150&#10;player2,5,15,10,3120&#10;player3,4,10,20,2410"
                        />
                    </CardContent>
                    <CardFooter>
                        <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={isProcessing}
                        >
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

function CsvPasteButton() {
    const { pending } = useFormStatus();
    return (
         <Button type="submit" className="w-full" disabled={pending}>
            <ClipboardPaste className="mr-2 h-4 w-4"/>
            {pending ? 'Processing...' : 'Process Pasted Content'}
        </Button>
    )
}

function UsersTable({ users, loading }: { users: User[], loading: boolean }) {
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    
    const sortedUsers = [...users].sort((a,b) => {
        const ratingA = calculateStats(a).rating;
        const ratingB = calculateStats(b).rating;
        return ratingB - ratingA;
    });

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        const result = await deleteUser(userToDelete.id);
        setIsDeleting(false);

        if (result.success) {
            toast({
                title: 'Success',
                description: 'User deleted successfully.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message || 'Failed to delete user.',
            });
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
                                <TableHead>Rating</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center">
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
                                    <TableCell>{calculateStats(user).rating.toFixed(2)}</TableCell>
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
                toast({
                    title: 'Success',
                    description: 'User updated successfully.',
                });
                formRef.current?.reset();
                setAvatarPreview(null);
            } else if (!state.success) {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: state.message,
                });
            }
            state.message = '';
            state.user = null;
            state.success = false;
        }
    }, [state, toast]);


    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setAvatarPreview(null);
        }
    };


    return (
        <Dialog onOpenChange={() => setAvatarPreview(null)}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4"/>
                    <span className="sr-only">Edit User</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form action={formAction} ref={formRef}>
                    <DialogHeader>
                        <DialogTitle>Edit User: {user.name}</DialogTitle>
                        <DialogDescription>Update the user's details below.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label htmlFor="totalMaps">Maps Played</Label>
                           <Input id="totalMaps" name="totalMaps" type="number" defaultValue={user.totalMaps} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totalKills">Kills</Label>
                            <Input id="totalKills" name="totalKills" type="number" defaultValue={user.totalKills} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totalDeaths">Deaths</Label>
                            <Input id="totalDeaths" name="totalDeaths" type="number" defaultValue={user.totalDeaths} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totalDamage">Damage</Label>
                            <Input id="totalDamage" name="totalDamage" type="number" defaultValue={user.totalDamage} required />
                        </div>
                        <div className="col-span-2">
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
    )
}
