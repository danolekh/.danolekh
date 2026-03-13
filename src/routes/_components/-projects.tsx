import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Projects() {
  return (
    <section className="py-8 px-6 md:px-12">
      <div className="max-w-208 mx-auto">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Projects</h2>
        <div className="grid gap-6">
          <a href="https://ifit.danolekh.com" target="_blank" rel="noopener noreferrer">
            <Card className="hover:ring-foreground/20 transition-all cursor-pointer">
              <img
                src="/images/ifit.png"
                alt="iFit store preview"
                className="w-full object-cover"
              />
              <CardHeader>
                <CardTitle className="text-lg">iFit</CardTitle>
                <CardDescription>
                  E-commerce store for selling sports equipment in Ukraine
                </CardDescription>
              </CardHeader>
            </Card>
          </a>
        </div>
      </div>
    </section>
  );
}
