// Flips the home page to the web3 version: hero copy, the three onchain project cards and the
// EVM skill badges. Off until the contracts are deployed and verified, so today's build renders
// the current site unchanged. The `/p/*` write-ups stay `draft: true` in their frontmatter
// independently of this flag.
export const WEB3_LIVE = false;

export const siteConfig = {
  name: "Dan Olekh",
  url: "https://www.danolekh.com",
  ogImage: "https://www.danolekh.com/og.jpg",
  description: "Software Engineer",
  ens: "danolekh.eth",
  farcaster: "https://warpcast.com/danolekh",
  email: "danyaolekhq@gmail.com",
  links: {
    twitter: "https://x.com/danolekh",
    github: "https://github.com/danolekh",
    linkedin: "https://www.linkedin.com/in/danolekh",
    telegram: "https://t.me/danolekh",
  },
};
