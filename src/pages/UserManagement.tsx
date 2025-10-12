import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
  } | null;
  auth_email?: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF" | "VIEWER">("STAFF");

  useEffect(() => {
    fetchUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchUsers = async () => {
    try {
      // Fetch user_roles
      const { data: userRolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("role", { ascending: true });

      if (rolesError) throw rolesError;

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      if (profilesError) throw profilesError;

      // Merge the data
      const merged = (userRolesData || []).map((ur) => {
        const profile = profilesData?.find((p) => p.user_id === ur.user_id);
        return {
          ...ur,
          profiles: profile ? { full_name: profile.full_name } : null,
        };
      });

      setUsers(merged as UserRole[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading users",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Convert username to email format
      const email = `${username.toLowerCase()}@system.local`;

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Call edge function to create user
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, fullName, role },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "User created successfully",
        description: `Username: ${username}`,
      });

      // Reset form
      setUsername("");
      setPassword("");
      setFullName("");
      setRole("STAFF");
      setDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: userToDelete.user_id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "User deleted successfully",
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "STAFF":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage system users and their roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-3 md:space-y-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="h-9 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="role" className="text-sm">Role</Label>
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={creating} className="flex-1 h-9 text-sm">
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="h-9 text-sm"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">System Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm px-2 md:px-4">Name</TableHead>
                    <TableHead className="text-xs md:text-sm px-2 md:px-4">Role</TableHead>
                    <TableHead className="text-xs md:text-sm px-2 md:px-4 hidden sm:table-cell">User ID</TableHead>
                    <TableHead className="text-xs md:text-sm px-2 md:px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-xs md:text-sm px-2 md:px-4">
                        {user.profiles?.full_name || "N/A"}
                      </TableCell>
                      <TableCell className="px-2 md:px-4">
                        <Badge variant={getRoleBadgeVariant(user.role) as any} className="text-xs">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground px-2 md:px-4 hidden sm:table-cell">
                        {user.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="px-2 md:px-4">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={user.user_id === currentUserId}
                          className="h-7 px-2 text-xs"
                        >
                          <Trash2 className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-xs md:text-sm py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete {userToDelete?.profiles?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="h-9 text-sm m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={deleting}
              className="h-9 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
