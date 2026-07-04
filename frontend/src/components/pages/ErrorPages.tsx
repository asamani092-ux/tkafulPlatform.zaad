import { Link } from "react-router-dom";
import Card from "../ui/Card";
import Button from "../ui/Button";
import PageShell from "../ui/PageShell";

export function ForbiddenPage() {
  return (
    <PageShell>
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="mb-2 text-3xl font-extrabold text-primary">403</h1>
        <p className="mb-4 text-brand-gray">ليس لديك صلاحية الوصول إلى هذه الصفحة.</p>
        <Link to="/"><Button>العودة للرئيسية</Button></Link>
      </Card>
    </PageShell>
  );
}

export function NotFoundPage() {
  return (
    <PageShell>
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="mb-2 text-3xl font-extrabold text-primary">404</h1>
        <p className="mb-4 text-brand-gray">الصفحة المطلوبة غير موجودة.</p>
        <Link to="/"><Button>العودة للرئيسية</Button></Link>
      </Card>
    </PageShell>
  );
}
