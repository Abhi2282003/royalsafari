import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Collections = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Collections</h1>
        <p className="text-muted-foreground">Track and manage agent payments</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Agent collections management will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Collections;
