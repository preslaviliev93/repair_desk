# RepairDesk Offline

A local-first workshop management application with a dark dashboard, repairs, customers, parts inventory, manually recorded approvals, 90-day service warranties, printable reports and JSON backup/restore. Sample records are included. The weekly activity chart is illustrative; revenue and order counts reflect saved records.

## Development

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

`npm run build` produces the web bundle. Fonts are bundled, with no external runtime assets. `npm run desktop` builds and opens the Electron desktop application. Desktop runtime uses local files with no HTTP listener. The Vite development server is only for development.

## Windows install and uninstall

On Windows, run `npm ci` then `npm run dist:win`. The NSIS installer is written to `dist/`. It supports installation directory selection and desktop shortcuts. Uninstall through Windows Settings > Apps. Alternatively, run the Windows installer GitHub Actions workflow after pushing this repository. The workflow produces a downloadable installer artifact. Windows packaging has not been executed in the Linux onboarding environment.

Unsigned builds can trigger Windows SmartScreen or antivirus reputation prompts. Distribute a properly code-signed installer for production. This project does not bypass Windows security checks. Signing certificates must be configured securely in your build environment.

## Data and limitations

Records are saved in localStorage in the browser or Electron application profile. Browser and desktop profiles are separate. Export backups regularly and before uninstalling; uninstall is not a secure data-erasure operation. Restore replaces the current dataset after confirmation. Currency is USD. Approvals are recorded by workshop staff after customer contact, without sending messages. Warranties cover a fixed 90-day period from completion. No cloud sync, authentication, payment processing or automatic customer messaging is included.

Use the desktop build for offline launches. The web development server is not an installable offline PWA. Desktop packaging and Windows-specific behavior require validation on Windows before distributing to customers.
