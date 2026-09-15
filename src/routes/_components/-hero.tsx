import { Link } from "@tanstack/react-router";
import { WEB3_LIVE } from "@/lib/config";

export default function Hero() {
  return (
    <section className="relative pt-12 pb-8 md:pt-24 md:pb-12 px-6 md:px-12 overflow-hidden">
      <div className="max-w-208 mx-auto z-10 w-full relative">
        <div className="flex flex-col items-start gap-10">
          <div className="flex gap-8">
            <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
              <img
                src="/images/me.jpeg"
                alt="Dan Olekh"
                className="object-cover rounded-2xl shadow-lg"
              />
            </div>

            <div className="flex flex-col justify-between py-1">
              <div>
                <div className="text-3xl md:text-4xl font-bold tracking-tight">Dan Olekh</div>
                <p className="text-lg text-muted-foreground">
                  {WEB3_LIVE ? "Software engineer · TypeScript · EVM" : "Software engineer"}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-start space-y-8">
            <div>
              <div className="text-lg leading-relaxed max-w-full">
                {WEB3_LIVE ? (
                  <>
                    <p className="mb-2">
                      I build products that hold money correctly: three years of TypeScript
                      full-stack work, most recently the wallet, ledger and withdrawal services of a
                      live iGaming platform.
                    </p>
                    <p className="mb-2">
                      Since September 2026 I build on EVM: a USDC milestone escrow on Base, a
                      ledger-grade event indexer in Effect, and effect-viem.
                    </p>
                    <p>Contracts are verified, tests are public, write-ups are below.</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2">
                      I'm an engineer who loves building fast, user-loved platforms. I love working
                      with TypeScript and Zig.
                    </p>
                    <p>My goal is to build scalable products that look great and feel natural.</p>
                  </>
                )}
              </div>
              <p className="text-lg mt-4">
                Check out my{" "}
                <Link
                  to="/feed"
                  className="underline underline-offset-4 text-primary hover:text-primary/80 transition-colors"
                >
                  feed
                </Link>{" "}
                for what I've been reading and thinking about, or my{" "}
                <Link
                  to="/b"
                  className="underline underline-offset-4 text-primary hover:text-primary/80 transition-colors"
                >
                  writing
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
