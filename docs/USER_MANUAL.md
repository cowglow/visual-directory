# User Manual

This is a map-based visual directory for keeping track of members and where they live.
Leaders can add and edit members and organize them into groups. Everyone who's logged
in can see the full directory — you don't need to be a leader to look people up, only
to make changes.

## Signing in

There are no passwords. Instead:

1. Open the app and type your email address on the sign-in screen.
2. Click **Send login link**.
3. Check your email (or, if you're a leader testing the app before real email
   sending is set up, ask whoever runs the server to check its console log — see the
   note at the bottom of this manual) for a message with a login link.
4. Click that link. It opens the app and logs you in — no password to remember.

The link expires after 15 minutes and can only be used once. If it's expired, just
go back to the sign-in screen and request a new one.

You only need to do this once every 7 days or so — after that, you'll just need to
sign in again the same way.

**You can't sign yourself up.** Only an existing leader can give you access (see
"Inviting someone" below). If you try to sign in with an email nobody has invited
yet, the app won't tell you that outright — it just won't send you a link, so
nothing will show up in your inbox.

## Roles

- **Leader**: can see everyone, and can add, edit, and remove members and
  organizations.
- **Member**: can see everyone (same full directory — addresses, contact info,
  everything), but can't add, edit, or remove anything. Think of it as "read-only."

If you're logged in as a member, you'll notice a few things are simply missing
compared to what's described below — the **Accounts** tab at the bottom is greyed
out, the Menu's **Data** section (import/export) isn't there at all, there are no
Edit/Remove buttons on people's pins, and clicking the map doesn't do anything.
That's expected; that's what read-only means here.

## The map

Everyone in the directory who has an address shows up as a pin on the map. Click a
pin to see that person's name, address, and whether they're marked active or lost
contact.

### Adding a member (leaders only)

Click anywhere on the map where that person lives. A form pops up already knowing
the location you clicked — fill in their name, address, phone, email, and (if you've
created any) which organization they belong to, then **Save**. Their pin appears
right where you clicked.

There's no separate "Add Member" button — clicking the map *is* how you add someone,
at the location you click.

### Editing a member, or marking them lost contact

Click their pin, then **Edit** in the popup. You can change any of their details
here. There's also a **Lost contact** checkbox — check it and enter the date they
were last known to be active, and their pin will show that status from then on.
Unchecking it marks them active again.

### Removing a member

Click their pin, then **Remove**. This deletes them — there's no undo, so double
check before confirming.

### Quick-pinning a member without details yet (leaders only)

If you just want to mark where someone lives without stopping to fill in the whole
form — for example, working from a paper list and placing everyone first — hold
**Shift** and click the map. This drops an amber pin with no name yet, no form
interruption. Click that amber pin later (or find it in the Organizations list,
where it shows as "Untitled member") and it opens the form directly so you can fill
in the details; saving turns it into a normal pin.

### Moving a member's pin (leaders only)

If someone's location was placed slightly wrong, or they've moved, click their pin
and choose **Move** from the popup instead of re-entering their address. The pin
turns green and follows your cursor — click the new location to drop it there. This
updates their address's coordinates only; if their street address also changed, use
**Edit** for that.

## Organizations

Leaders can group members into organizations (Region, Headquarter, Area, or
District). To create one: tap **Organizations** in the bottom navigation, then
**Add Organization** at the top of the screen. Give it a name and pick its type.
Once created, it shows up as an option when adding or editing a member.

The **Organizations** tab shows everyone grouped into a tree by organization. Tap a
member's name there to highlight and center their pin on the map (switch to the
**Map** tab to see it — selecting a member doesn't change which screen you're on);
double-tap an organization's name to select and center every member in it at once
(a single tap only expands/collapses the group, so browsing the tree doesn't
accidentally light up the whole map). Tapping a member also opens a details panel
pinned near the bottom of the screen, with an **Edit** shortcut — it stays in view
as you keep scrolling the tree, so a long, fully-expanded tree never pushes it out
of sight.

## Importing and exporting the roster (leaders only)

Tap **Menu** in the bottom navigation — the **Data** section (leader-only; members
won't see it at all) handles the whole directory as a file:

- **Export as CSV** downloads everyone currently in the directory as a CSV file —
  useful as a backup, or for opening in a spreadsheet.
- **Export as GeoJSON** downloads the same roster as a GeoJSON `FeatureCollection`
  (`members.geojson`) — useful for loading into mapping tools like QGIS, Leaflet, or
  Mapbox. Each member is a point feature; members you haven't placed on the map yet
  are still included, just without a location.
- **Import** lets you pick a CSV file (in the same format the CSV export produces).
  This **replaces the entire directory** with the file's contents — every existing
  member is removed first, then every row in the file is (re)created. It's not a
  merge and nothing is skipped by matching ID, so re-importing an older export will
  bring the roster back down to exactly what's in that file. Double-check you have
  the file you mean to before importing.

## Inviting someone (leaders only)

Tap **Accounts** in the bottom navigation, then **Invite Account** at the top of the
screen. Enter their email and pick whether they should be a **Member** (read-only)
or **Leader** (read + write), then **Send invite**. They can now sign in with that
email using the steps at the top of this manual — there's nothing else they need to
do to accept the invite.

## Other things in the interface

- **Bottom navigation**: four tabs — **Map**, **Organizations**, **Accounts**
  (leader-only; greyed out for members), and **Menu**. Each one is a full screen of
  its own; there are no floating or overlapping windows to manage.
- **Menu**: everything that doesn't belong on one of the other three tabs — the
  leader-only **Data** section (import/export above), the map's basemap choice,
  language, signing out, and About (the project's source code and this app's
  privacy notice).
- Screens you navigate away from (an edit form, say) aren't lost — closing one with
  its **X** or **Cancel** just returns you to whatever was open before it, same as
  tapping a different bottom-nav tab.

## If something goes wrong

- **"Can't connect"** screen after signing in: the app can't reach the server right
  now — could be the server is restarting, or your internet dropped. Your login
  isn't lost; click **Retry** once the connection is back and you'll land right back
  where you were, no need to sign in again.
- **A banner at the top saying "Couldn't load data"**: the map loaded, but fetching
  the member/organization list failed. Click **Retry** on the banner. If it keeps
  happening, the server may be down — check with whoever manages it.
- **A pop-up alert after saving/editing/removing something**: this means that
  specific action failed (not the whole app) — usually either a connection hiccup
  (try again) or, less commonly, that your account doesn't have permission for that
  action.
- **Login link says "Invalid or expired"**: links only work once and expire after 15
  minutes. Just request a fresh one from the sign-in screen.

### Note for whoever runs the server

Login links are only logged to the server's own console, not actually emailed, until
`RESEND_API_KEY`/`EMAIL_FROM` are set — see `docs/RESEND_EMAIL_SETUP.md`. Until then,
you'll need to check the server console to get someone's login link on their behalf.
