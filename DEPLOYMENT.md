# Deploying Aartha to AWS

**Recommendation: Lightsail container service, Micro tier, $10/month flat.**

It is predictable (one flat line on the bill, no usage dimensions to model), it
is container-based so it is immune to the Next.js-version risk that could bite
you on Amplify, and it is free for the first 3 months on a new account. That is
roughly **13 months of runway on $100 of credits**.

If you would rather optimise for cheapest, Amplify wins on price — but verify
its Next.js 16 support first. See [Alternatives](#alternatives).

---

## Before you can deploy anything

Two things in this repo will stop a container build. Fix both first.

### 1. The Dockerfile uses npm, but this project is pnpm

`Dockerfile` currently does:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
```

There is no `package-lock.json` in this repo — only `pnpm-lock.yaml`, and
`package.json` pins `"packageManager": "pnpm@9.0.0"`. The build fails on the
`COPY`. It needs to be pnpm via corepack.

### 2. There is no standalone output

`next.config.ts` does not set `output: "standalone"`, so the runner stage copies
the entire `node_modules`. That is roughly a 1 GB image instead of ~200 MB, and
on a 1 GB Micro instance the difference between those two is whether the
container starts at all.

Add to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  // ...existing config
};
```

Then the runner stage copies `.next/standalone`, `.next/static` and `public`
only, and starts with `node server.js` rather than `npm run start`.

---

## Cost

Assuming early-access traffic — a few thousand views a month, under 10 GB egress.

| option | monthly | $100 lasts | notes |
|---|---|---|---|
| **Lightsail Micro** | **$10 flat** | ~10 months (+3 free) | Recommended. 0.5 TB transfer included |
| Lightsail Small (2 GB) | $20 flat | ~5 months | If 1 GB proves tight |
| Amplify Hosting | ~$2–12 | 8+ months | Cheapest, but usage-based and Next.js-version dependent |
| App Runner | ~$13–18 | ~6 months | ~$10/mo floor for provisioned memory alone; no scale-to-zero |
| EC2 t4g.small | ~$15 | ~6 months | You own patching and TLS |
| ECS Fargate + ALB | ~$30–40 | **<3 months** | Avoid — the load balancer alone is $16–22/mo before any traffic |

Plus, on any option: Route 53 hosted zone $0.50/mo, ECR/Lightsail image storage
under $0.10/mo, ACM certificates free, first 100 GB/mo egress free.

### Two things that would burn the credits

**Do not migrate the database to DocumentDB.** It has no free tier and starts
around **$69/month**, which drains $100 in about six weeks at zero traffic.
Keep MongoDB on Atlas M0 (free) and put the cluster in the same region as the
container so you are not paying for cross-region latency.

**Do not put an Application Load Balancer in front of this.** At this scale the
ALB costs more than the application. Lightsail includes a public HTTPS endpoint;
that is all this app needs.

### The credit expiry trap

The AWS Free plan closes at **6 months or when credits hit zero, whichever comes
first** — but the credits themselves stay valid for 12 months from signup. If
you are still on the Free plan at month 6, switch to the Paid plan before then
or you lose whatever credit is left.

---

## Deploy

### Prerequisites

- AWS CLI configured (`aws configure`)
- The [`lightsailctl` plugin](https://docs.aws.amazon.com/en_us/lightsail/latest/userguide/amazon-lightsail-install-software.html)
  (required by `push-container-image`)
- Docker running locally
- Both blockers above fixed

### 1. Create the service

```bash
aws lightsail create-container-service \
  --service-name aartha \
  --power micro \
  --scale 1 \
  --region ap-south-1
```

Use the region closest to your users and matching your Atlas cluster.
`ap-south-1` (Mumbai) suits an India-focused product.

### 2. Build and push the image

```bash
docker build -t aartha:latest .

aws lightsail push-container-image \
  --service-name aartha \
  --label app \
  --image aartha:latest \
  --region ap-south-1
```

The command prints the image reference it stored, e.g.
`:aartha.app.1`. Use that in the next step.

### 3. Describe the deployment

`containers.json` — note that secrets go here, so keep it out of git:

```json
{
  "app": {
    "image": ":aartha.app.1",
    "ports": { "3000": "HTTP" },
    "environment": {
      "NODE_ENV": "production",
      "MONGODB_URI": "<atlas-srv-uri>",
      "AUTH_SECRET": "<32+ random characters>",
      "NEXTAUTH_URL": "https://aartha.app",
      "NEXT_PUBLIC_APP_NAME": "Aartha",
      "NEXT_PUBLIC_SITE_ORIGIN": "https://aartha.app",
      "RESEND_API_KEY": "<resend key>",
      "RESEND_FROM": "Aartha <noreply@your-verified-domain.com>",
      "DEMO_RESET_MINUTES": "60"
    }
  }
}
```

`public-endpoint.json`:

```json
{
  "containerName": "app",
  "containerPort": 3000,
  "healthCheck": {
    "path": "/api/health",
    "intervalSeconds": 10,
    "healthyThreshold": 2,
    "unhealthyThreshold": 3,
    "timeoutSeconds": 5
  }
}
```

The app already serves `/api/health`, so use it rather than `/` — the root
route is server-rendered and a slow render would fail the check.

One caveat: `/api/health` returns **503 when Mongo is unreachable**, so an Atlas
outage will make Lightsail consider the container unhealthy and cycle it, which
does not fix anything and turns a database blip into downtime. If that becomes a
problem, point the health check at a route that only proves the process is
alive, and monitor the database separately.

### 4. Deploy

```bash
aws lightsail create-container-service-deployment \
  --service-name aartha \
  --containers file://containers.json \
  --public-endpoint file://public-endpoint.json \
  --region ap-south-1
```

First deployment takes a few minutes. Watch it with:

```bash
aws lightsail get-container-services --service-name aartha --region ap-south-1
```

### 5. Atlas network access

Lightsail container services do not have a fixed outbound IP. Either allow
`0.0.0.0/0` in Atlas Network Access and rely on the SRV credentials, or move to
a Lightsail instance with a static IP if you need to pin the allowlist.

### 6. Custom domain

Attach the domain in the Lightsail console under the service's **Custom domains**
tab; Lightsail provisions and renews the certificate. Then point your DNS at the
service's endpoint. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_ORIGIN` to the
real origin — `NEXT_PUBLIC_SITE_ORIGIN` is used for images inside transactional
email, so it must be publicly reachable.

---

## After deploying

Check these, in order:

1. `GET /api/health` returns OK.
2. The landing page renders and the **Explore live demo** button lands you on a
   populated dashboard. First click after a deploy may take ~1s while the demo
   data seeds; every click after that should be near-instant. See
   `src/server/demo-seed.ts`.
3. Registration email arrives — confirms `RESEND_*` and that
   `NEXT_PUBLIC_SITE_ORIGIN` is reachable from the outside.
4. The PWA installs and the service worker registers over HTTPS.

To pre-seed the demo account so the very first visitor also gets the fast path:

```bash
node scripts/seed-demo.mjs .env.production.local
```

---

## Alternatives

### Amplify Hosting — cheapest, with a caveat

Roughly $2–12/month at this traffic, Git-push deploys, no container to maintain.
The catch is that Amplify's Next.js support trails Next releases, and this app is
on **16.3**. Verify Amplify supports it before committing, or you will be
debugging build failures instead of shipping. Pricing is also multi-dimensional
(build minutes + GB served + SSR requests + SSR compute-seconds), so the bill is
harder to predict than a flat $10.

### App Runner

Cleaner than Fargate, but there is no scale-to-zero: provisioned memory is
billed continuously, which puts a floor around $10/month for a 2 GB instance
before a single request — plus active compute, build minutes, and $1/month for
automatic deployments. It costs more than Lightsail for the same result.

---

## Cost guardrail

Whichever option you pick, set a billing alarm before you deploy:

```bash
aws budgets create-budget \
  --account-id <account-id> \
  --budget '{"BudgetName":"aartha-monthly","BudgetLimit":{"Amount":"25","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}'
```

Credits mask real spend — you find out you were burning $40/month only when
they run out. An alarm at $25 tells you six months early.
