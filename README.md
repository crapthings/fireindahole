# Fire in da Hole

A playful 3D browser game: flick grenades into a moving target, follow the arc, and enjoy cartoon collision sounds. Built with React Three Fiber, Three.js, and Vite.

**[Play in your browser](https://crapthings.github.io/fireindahole/)**

## Make your own with run3d

Have an idea for a 3D game or interactive experiment? Try **[run3d](https://github.com/crapthings/run3d)**, my JavaScript starter for getting from an idea to an editable 3D scene in one command. It brings together Vite, React Three Fiber, and tools for animation, physics, and creative coding, so you can get straight to building.

With Node.js 24 and pnpm installed:

```sh
npx @crapthings/run3d my-3d-game
cd my-3d-game
pnpm dev
```

Edit `src/Scene.jsx` to start experimenting. **[Explore run3d and give it a star](https://github.com/crapthings/run3d)** if it helps you build something fun.

## Development

Use Node.js 24 and the pnpm version specified in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Publish to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch, including `pnpm-lock.yaml` and `.github/workflows/deploy-pages.yml`.
2. In the repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
3. Open **Actions → Deploy GitHub Pages → Run workflow**, or push another commit to `main`.
4. Wait for the build and deployment jobs to finish. The deployment URL appears in the workflow and in **Settings → Pages**.

The workflow installs dependencies, builds `dist`, and publishes it. It obtains the base path from GitHub Pages, supporting both repository sites (`https://USER.github.io/REPO/`) and root/custom-domain sites. Audio URLs use Vite's base path as well.

Subsequent pushes to `main` automatically update the site. No personal access token or deployment secret is needed by the workflow; it uses GitHub's scoped `GITHUB_TOKEN`.

Local deployment verification, when desired:

```sh
pnpm build
pnpm preview
```

Official references: [Vite deployment](https://vite.dev/guide/static-deploy#github-pages) and [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
