# Starter library

Copy components/ into src/components/formwork/ and public/ into your Astro public directory. Import Button from './components/formwork/Button.astro'. Wrap output in an element with data-fw-theme="light" and data-fw-density="comfortable".

<Button label="Continue" emphasis="primary" size="medium" />

Default and named icon slots are supported. Native attributes pass through; attach event listeners in your application using id/data attributes. No function/event strings are imported from library data. Loading disables activation, sets aria-busy, and retains label. Color and density contexts inherit. Preview flags are never exported.

Remote font stylesheet registrations are metadata; include the declared HTTPS stylesheet explicitly in your app. Portable files are backups; browser autosave is local to this browser.
