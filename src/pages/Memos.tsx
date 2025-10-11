import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Memos = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Owner Memos</h1>
        <p className="text-muted-foreground">Generate and manage owner payment memos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Owner memo generation will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Memos;
