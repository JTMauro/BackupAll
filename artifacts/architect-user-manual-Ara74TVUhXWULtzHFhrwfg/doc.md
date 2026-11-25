# Architect User Manual

# Tab 1

## Architect User Manual

2026-11-17 · @JT Mauro

### Welcome

Architect is one app for diagrams, graphic design, slide decks and CAD drawings. It has 784 shapes and emoji, 133 templates, and a built-in Claude chat that draws and edits for you.

Architect comes in two versions with the same app inside:

| Version | Where it runs | How you sign in | Best for |
|---|---|---|---|
| Hosted | On claude.ai, as a shared page | Your Claude account | Individuals and small teams; Claude chat works directly in the page |
| Network | On one computer in your office (Architect Server) | A username and password on that server | Companies that want everything on their own network, with an admin console and document repository |

When Architect opens, the Architect robot spins, taps a wand, sparks fly, the title appears, and the robot settles in the upper-left corner. Click the robot any time for a menu: Draw with Claude, Replay the intro, Getting started and Settings. To change how often the intro plays, see Settings and personalization.

### Getting started

Open Architect, choose a template or a blank page, and start dragging shapes onto the canvas. Your work saves automatically.

#### Signing in

- **Hosted version:** open the Architect link on claude.ai while signed in to Claude. Your diagrams save to your account in that page; team diagrams save to the team library.
- **Network version:** open the address your administrator gives you, for example `http://192.168.1.20:8080`. Sign in with your username and password, plus a code from your authenticator app if two-step sign-in is on. The first time, you choose a new password.

#### The screen

| Area | What it holds |
|---|---|
| Top bar | The robot menu, the document name, the File, Edit, View, Insert, Arrange, Tools and Help menus, Draw with Claude, Share, Export, Settings and your account |
| Toolbar | Select, hand, connector, text, sticky note, pen, polyline, measure, comment, basic shapes, picture, undo and redo, then font, size and style controls for the selection |
| Left panel | Shapes (search and categories, including Company and My shapes & pictures), Templates and Layers |
| Canvas | Your page. Scroll to pan, Ctrl+scroll or pinch to zoom, and use the minimap in the corner |
| Right panel | Style, Arrange, Data, Page and Comments for whatever is selected |
| Bottom bar | Page tabs. Click + to add a page; right-click a tab to rename, copy or delete it |

#### Your first diagram

1. Click **File › New diagram**, or pick a template from the **Templates** tab.
2. Drag a shape from the left panel, or double-click the canvas to search for one.
3. Hover a shape and drag one of its blue arrows to draw a connected shape.
4. Double-click a shape to type its label.
5. Use the right panel to change color, outline, effect and text.
6. Click **Share** to give others access, or **Export** to save a file.

The save status next to the title shows where your work is kept: this browser, your account, the team library or the server. **File › Version history** brings back earlier versions.

### Drawing and diagramming

Everything on the canvas is a shape, a connector or a picture, and all of them are styled from the right panel.

#### Shapes

- **Library:** 784 shapes in categories such as Basic, Flowchart, UML, BPMN, Network, Cloud architecture, Floor plan, Electrical, Arrows, Callouts, Math and logic, Business, Devices, Transport, Nature, 16 drawn emoticons and about 450 emoji. Type in the search box to find any of them.
- **Add:** drag from the library, click a toolbar shape, or double-click the canvas and type a name.
- **Quick add:** hover a shape and drag a blue arrow, or press Ctrl+Shift+arrow to add a connected shape in that direction.
- **Draw your own:** the pen draws freehand, the polyline (Y) draws straight segments (click the first point to close the shape), and **Edit points** (double-click a drawn shape) lets you drag, add or delete points and curve handles.
- **Combine:** Arrange › Combine shapes › Union, Subtract, Intersect or Exclude.

#### Connectors

Draw with the connector tool (or drag from a shape's arrow). Connectors attach to 12 points on each shape and stay attached when shapes move. In the Style tab choose elbow, straight or curved; arrow ends including UML and database (crow's foot) ends; dashed lines; flowing animation; and a label. Line jumps draw small hops where lines cross (View › Turn off line jumps).

#### Text

Double-click any shape to type. The toolbar sets font, size, bold, italic, underline and alignment. Text effects (shadow, lift, hollow, outline, neon, echo, splice, glitch, highlight and curved) are in the right panel under **Text effect**.

#### Styles and effects

The Style tab sets fill, gradient, outline, corner radius, opacity, hatching and blend mode. Effects give shapes depth: Flat, Shadow, 3D extrude, Glass, Neon, Hand-drawn, Inner shadow, Lifted and Blur. **Tools › Diagram theme** restyles a whole page (Architect, Bold 3D, Blueprint, Midnight neon, Claude, Canva bright, Figma clean and more).

#### Arranging and layers

- Align, distribute, flip, rotate, group and change stacking order from **Arrange**.
- **Auto layout** for diagrams (Arrange › Tidy up) lays out flows top-down, left-right, as a tree, a mind map or a grid.
- Smart guides and snapping line shapes up with their neighbours, the grid and ruler guides (drag a guide out of a ruler).
- **Layers** (left panel) hide, lock and reorder groups of shapes.
- **Make array** copies a shape in rows, columns or a circle.
- **Select matching** (Edit menu) selects every shape with the same shape, fill, outline or text style.

### Templates

Open the **Templates** tab in the left panel to start from one of 133 templates. Search by name, or pick a category from the list.

| Category | Examples |
|---|---|
| Diagrams | Flowchart, org chart, mind map, network, cloud architecture, database ERD, UML, BPMN, swimlanes, floor plan |
| Process | Approval workflow, hiring, onboarding, sales pipeline, order to cash, incident response, returns, field sales day |
| Org & planning | Department org chart, project team, work breakdown, OKR tree, RACI matrix, risk register, weekly schedule |
| Brainstorm | Strategy and study mind maps, meeting agenda map |
| Whiteboard | Retrospectives (4 kinds), kanban, affinity map, SWOT, Eisenhower matrix, impact vs effort, lean canvas, business model canvas, persona, empathy map |
| Business | Customer journey, marketing funnel, fishbone, 5 whys, PDCA, value stream, competitive analysis |
| Technical | Microservices, three-tier app, data pipeline, CI/CD, ETL, machine learning workflow, state machine |
| Product | Login and checkout flows, sitemap, product roadmap |
| Design | Instagram posts and stories, Facebook, LinkedIn, YouTube thumbnail, poster, flyer, business card, certificate, invitation, menu, website hero, email header |
| Presentations | Pitch deck, quarterly business review, project status, training, sales proposal, all-hands, marketing plan, lesson plan, case study, product launch |
| Wireframes | Landing page, pricing page, blog, product page, dashboard, and mobile login, sign-up, feed and settings screens |

If the current page is empty, the template replaces it. Otherwise Architect saves your current diagram and opens the template as a new one.

### Design tools

Architect includes the core tools of product design apps such as Figma: frames, auto layout, constraints, reusable components, styles and variables, prototypes and code inspection.

- **Frames:** Insert › Frame, or File › Create a design for a preset size. Shapes inside a frame move with it. Frames can show a **layout grid** of columns (Style tab).
- **Auto layout:** select a frame and choose Auto layout › Row or Column in the Arrange tab. Set the gap, padding and alignment; children re-flow as you add, remove or resize them.
- **Constraints:** select a shape inside a frame and choose how it behaves when the frame is resized: Left, Right, Center, Left and right (stretch) or Scale, and the same for top and bottom.
- **Components (symbols):** select shapes and choose Arrange › Save as symbol. Place copies from the library. Edit the master (double-click a copy › Edit symbol) and every copy updates. **Detach** turns one copy back into ordinary shapes.
- **Styles and variables:** Tools › Styles and variables. Create color variables with a value per mode (for example Light and Dark) and text styles. Apply them to shapes; change the variable or switch the mode and everything using it updates.
- **Prototypes:** in the Style tab under Link, link a shape to a frame, a page or a web address. In present mode, clicking it jumps there with the chosen transition.
- **Inspect:** the Data tab shows CSS and SVG code for the selected shape, ready to copy for developers.
- **Blend modes and effects:** multiply, screen, overlay and more, plus inner shadow, lift and blur.
- **Crop:** double-click a picture, or choose Crop in the Style tab, and drag the crop handles.
- **Follow:** on a shared diagram, click a collaborator's picture at the top to follow their view; click again to stop.

### Graphic design

For social posts, print pieces and marketing graphics, Architect has the everyday tools of apps such as Canva: preset sizes, magic resize, a brand kit, photo editing and text effects.

- **Create a design:** File › Create a design. Choose from 35 sizes in Social (Instagram, Facebook, LinkedIn, X, YouTube, Pinterest, TikTok), Presentations, Print (Letter, A4, posters, flyers, business cards, certificates, menus) and Web (hero, phone, tablet, email header, ad sizes), or type a custom size.
- **Magic resize:** select a design frame and choose Tools › Magic resize. Tick the sizes you want; Architect makes a copy at each size with everything repositioned and scaled.
- **Brand kit:** Tools › Brand kit holds your brand colors, heading font and body font. Click a color or font to apply it to the selection, try a **font pairing**, pull colors **from a picture**, or click **Restyle this page with the brand**. Administrators set the brand kit for everyone.
- **Photos:** select a picture to see the Photo section: 8 filters (vivid, mono, vintage, cool, warm, dramatic, fade), brightness, contrast, saturation, tint and blur sliders, **Mask to** a shape (circle, heart, star, hexagon and more), **Remove background** for plain or solid backgrounds, and **Add its colors to the brand**.
- **Photo grids:** Insert › Photo grid adds frames of picture placeholders; double-click each to choose a picture.
- **Text effects:** shadow, lift, hollow, outline, neon, echo, splice, glitch, highlight and curved text, each with an effect color.
- **QR codes:** Insert › QR code. Type a web address; the code is added as a picture that also links to the address.
- **Export:** Export saves PNG, JPG, SVG or PDF. Use the Design section of a selected frame to export just that frame.

### Slides and presenting

A slide is a frame marked as a slide. Without slides, each page is shown as one slide.

#### Making slides

- **Insert › Slide 16:9** or **Slide 4:3** adds the next slide beside the last one.
- **Insert › Slide deck from an outline:** paste an outline (one slide per line, "-" lines become bullets, ">" lines become speaker notes). This works without Claude.
- Any frame becomes a slide: select it and tick **Use this frame as a slide** under Slides and animation.
- **Speaker notes:** select a slide frame and type in Speaker notes.
- **Step-by-step builds:** select a shape and set **Appear** to Step 1, Step 2 and so on. It appears on that click.

#### Presenting

Press **F5** or choose **View › Present**. Choose:

| Option | Choices |
|---|---|
| Transition | None, Fade, Slide in, Push up, Zoom |
| Builds | Reveal shapes step by step, or show everything at once |
| Advance | Manually, or every 3, 5, 10 or 20 seconds |
| Loop | Loop until Esc, for a kiosk or lobby screen |
| Presenter view | Current slide, next slide, notes and a timer |
| Start from | The beginning, or the current page or slide |

While presenting: → or Space next, ← back, **L** laser pointer, **P** presenter view, **B** black screen, Home and End, **Esc** to exit. In presenter view, **Open audience window** opens the slides in a second window to drag onto the projector. Shapes linked to a frame or page jump there, like a prototype.

#### PowerPoint

Export › PowerPoint saves an editable .pptx: shapes, text, tables, pictures and speaker notes, one slide per slide frame or page. Architect also opens .pptx files, including exports from Keynote, Google Slides and Canva.

### CAD and measuring

Architect draws to scale for floor plans, office layouts, wiring and simple technical drawings.

- **Units and scale:** Page tab › Units (px, mm, cm, m, in, ft) and drawing scale, for example 1:50. Rulers and measurements use them.
- **Rulers and guides:** View › Show rulers. Drag from a ruler to add a guide.
- **Polyline (Y):** click point by point; hold Shift to snap to 15° angles; double-click or Enter to finish; click the first point to close.
- **Object snap:** while drawing, Architect snaps to shape corners, midpoints, centers, line ends and crossings, and shows a small marker of what it snapped to. Hold Alt to turn snapping off.
- **Measure (M):** drag between two points to see the distance and angle in your units.
- **Dimension lines:** Insert › Dimension line. It shows its real length as you stretch it.
- **Libraries:** Floor plan (walls, rooms, doors, windows, stairs, furniture, kitchen and bath fixtures) and Electrical (switches, outlets, lights, panels, symbols).
- **Precise size:** type exact width, height, position and angle in the Arrange tab. Alt+arrow keys resize by small steps.
- **DXF:** File › Import opens DXF from AutoCAD and other CAD apps (lines, polylines with arcs, circles, arcs, ellipses, splines, hatches, blocks, text and layers). Export › DXF saves your drawing for CAD apps. For AutoCAD's .dwg format, save as DXF in AutoCAD first.

### Data, charts and conditional formatting

Shapes can carry data, and that data can drive their colors.

- **Shape data:** the Data tab lists fields for the selected shape (for example Owner, Cost, Status). Add, edit or remove fields. Data travels with exports to CSV.
- **Charts and tables:** Insert › Chart (bar, line, pie and more) and Insert › Table. Double-click to edit the values or cells.
- **Gantt charts and timelines:** Insert › Gantt chart or Timeline.
- **Diagram from data:** File › Import a CSV with id, name and manager columns to build an org chart; or Insert › Diagram from text to type Mermaid or an indented outline.
- **Conditional formatting:** Page tab › Rules. For example, "if Status is Late, fill red". Rules update colors as data changes.
- **Data links:** Page tab › Data link connects a page to a CSV at a web address (network version). Click **Refresh**, or set an automatic refresh interval, to update shape data and colors.

### Working with Claude

Claude works inside Architect through your own Claude account; there are no API keys to buy or manage. Open the chat with **Draw with Claude**, **Ctrl+J**, or by clicking the assistant character.

#### What you can ask

| Ask for | Example |
|---|---|
| A new diagram | "Draw a flowchart of our refund process" |
| A whole workspace | "Make three pages: org chart, onboarding flow and a RACI" |
| A slide deck | "Make 6 slides about our Q3 results, with speaker notes" |
| Artwork | "Draw a simple logo of a mountain and sun" (vector shapes you can edit) |
| Changes | "Color every Finance step green and add an approval step after Review" |
| Tidy up and critique | "Critique and fix this page", "Tidy the layout" |
| Translation | "Translate the labels to Spanish" |
| Finding things | "Find every shape that mentions billing" |
| Doing things | "Turn on rulers", "Switch to the Claude theme", "Export as PowerPoint" |
| Help | "How do I make a slide build?" |
| From a picture | Click **Picture** (or paste or drop one) with a whiteboard photo, sketch, screenshot or slide; Claude redraws it as editable shapes |

Every answer that changed something has its own **Undo this** button, and Ctrl+Z works as usual. Click + in the chat header to start a new chat.

#### Hosted and network versions

- **Hosted:** Claude answers right in the chat while you are signed in to Claude on claude.ai. If the page asks, allow Claude access in the page's Permissions menu.
- **Network:** Architect sends your request to Claude in your own Claude account, through the **Architect add-in** (a connector). Set it up once: **Account › Claude add-in › Create my connection token**, then add the connector in Claude as shown on screen. Claude's changes appear in Architect automatically. You can also just talk to Claude anywhere, for example "Make a flowchart of our refund process in Architect and share it with jsmith."

#### The assistant character

Your organization's character appears as a bust in the chat and in the lower-right corner. He breathes, thinks, talks and reacts while Claude works. Click him and he walks out full-length across the screen with a greeting, then returns to the chat. Administrators set the character in **Tools › Assistant character** (see Administrators). To hide the corner bust, tick **Hide the floating bust** there.

### Teamwork

Share a diagram, and everyone with access can open it, edit it together, comment and see its history.

- **Share:** click **Share**. On the network version, add people by name with **Can view** or **Can edit**, or open it to the whole organization. On the hosted version, save it to the **team library** so your team can open it. A link like `?doc=…` opens the diagram for anyone with access.
- **My diagrams, Shared with me, Organization:** File › Open lists them, with search, folders (File › Move to folder) and thumbnails.
- **Live editing:** when two people have the same diagram open, each sees the other's cursor, name and changes as they happen. Pictures at the top show who is there; click one to follow that person.
- **Comments:** press **C** and click a shape or a spot on the page. Reply, resolve and reopen in the **Comments** tab.
- **@mentions:** type @ in a comment and pick a person. They get an alert under the bell icon.
- **Search inside every diagram:** File › Search inside all diagrams finds words in any diagram you can open.
- **Version history:** File › Version history lists automatic versions; **Save a named version** marks milestones such as "Sent to client". Open any version to look at or restore it.
- **Libraries:** the **Company** section of the shape library holds your organization's icons, logos and shapes (it may have your company's name). **My shapes & pictures** holds your own uploads: click **Upload** to add pictures or SVG shapes.

### Files and other apps

Drop a file on the canvas, or use **File › Import a file**, to open it. Use **Export** to save.

| App or format | Open in Architect | Save from Architect |
|---|---|---|
| Visio | .vsdx and .vssx stencils | .vsdx |
| Lucidchart | Lucid's .vsdx export and CSV | .vsdx, CSV |
| draw.io / diagrams.net | .drawio, .xml | .drawio |
| Gliffy | .gliffy | — |
| Mermaid | Paste in Insert › Diagram from text | Mermaid text |
| PowerPoint, Keynote, Google Slides | .pptx (Keynote and Slides export to .pptx) | Editable .pptx |
| Canva | .pptx or PDF export, or sign in (below) | .pptx, or Send to Canva |
| Figma | Plugin, file link, plugin .json, or pasted SVG | Copy for Figma, or the plugin |
| PDF and Illustrator .ai | Page picture plus editable text | Vector PDF |
| SVG | Editable shapes and text | SVG |
| CAD | DXF | DXF |
| Pictures | PNG, JPG, GIF, WebP | PNG, JPG |
| Data | CSV | CSV, HTML page |

#### Figma

- **Paste:** in Figma, select frames and choose Copy as SVG; press Ctrl+V in Architect. In the other direction, File › Connected apps › **Copy for Figma**, then Ctrl+V in Figma.
- **Architect Bridge plugin:** moves whole pages both ways, keeping frames, auto layout, text, vectors, pictures and prototype links. Install it in Figma desktop from the `figma-plugin` folder in the server download (Plugins › Development › Import plugin from manifest). Sign in inside the plugin with your server address and your token from Account › Claude add-in.
- **Sign in to Figma** (network version): File › Connected apps › Sign in to Figma, then **Import a file** and paste a Figma link.

#### Canva

- **By file:** in Canva, Share › Download as PowerPoint (editable) or PDF, then open it in Architect. To go the other way, export from Architect as PowerPoint and upload it to Canva.
- **Sign in to Canva** (network version): File › Connected apps › Sign in to Canva. Then **My designs** brings any design in as editable shapes, exact pages or pictures, and **Send to Canva** turns the current diagram into a new Canva design you can keep editing there.

Signing in to Figma or Canva is available once your administrator has set it up (see Administrators).

### Settings and personalization

Open **Settings** (the gear in the top bar, or click the robot › Settings). Settings are saved for you on this device.

| Setting | Choices |
|---|---|
| Theme | Light, Dark, or match your computer |
| Window style | Original, Windows or Mac look |
| Intro | Every time, first time each day, or never; **Replay intro** plays it now |
| Robot in the corner | Show or hide |
| Default effect for new shapes | Flat, Shadow, 3D extrude, Glass, Neon, Hand-drawn, Inner shadow, Lifted, Blur |
| Grid and snapping | Grid style and size, snap on or off |
| Units | px, mm, cm, m, in, ft |
| Rulers and line jumps | View menu |
| High contrast | Tools › High contrast, for stronger outlines and focus marks |

On phones and tablets Architect shows a touch toolbar, bigger handles and long-press menus. **Tools › Outline view** lists every shape and connection as text for screen readers.

### Administrators

Administrators manage people, security, the shared libraries and connected apps from the **admin console**: Tools › Admin console, or `http://<server>:8080/admin` on the network version.

#### Setting up the network version

1. Install Node.js 18 or newer on the server computer and unzip **Architect Server**.
2. Run `start-windows.bat` or `./start-mac-linux.sh`. The window shows the addresses people open and the first admin password.
3. Sign in as `admin` and choose your own password.
4. Give the server a fixed IP address or DNS name. For access from outside the office, use your VPN or put HTTPS in front (see the server README).

#### Admin console tabs

| Tab | What you do there |
|---|---|
| Users | Add people, approve sign-ups, change roles, reset passwords (this also turns off their two-step sign-in), disable or delete accounts |
| Documents | See every diagram with its owner and access; open, share or delete any of them |
| Security | Require two-step codes for admins or everyone; allow or block data links |
| Company library | Upload icons, logos and shapes for everyone; rename the section (for example to Cydcor) |
| Connected apps | Enter the Client ID and secret of your own Figma app and Canva integration so people can sign in to them |
| Settings | Organization name, who can create accounts, session length, default sharing, lockout, public address, admin console only on the local network |
| Claude add-in | Turn Draw with Claude on or off for everyone |
| Activity | Sign-ins, failed sign-ins, sharing changes and admin actions |
| Server | Addresses, uptime, storage, HTTPS status and backup download |

#### Brand kit and assistant character

- **Tools › Brand kit:** set brand colors and heading and body fonts for everyone.
- **Tools › Assistant character:** upload a full-length picture of your character (a PNG with a transparent background looks best). Adjust the bust crop, name and greeting, and optionally add talking, thinking, smiling, concerned and walking pictures. Click **Preview the walk**, then **Save**. It applies to everyone.

#### Connecting Figma and Canva

1. Create a Figma app (figma.com/developers/apps) and a Canva integration with the Connect API (Canva Developer Portal).
2. Set their redirect addresses to `https://<server>/api/connect/figma/callback` and `https://<server>/api/connect/canva/callback`. Canva requires HTTPS.
3. Paste each Client ID and secret into **Connected apps** and save. People can then sign in from File › Connected apps.

#### Recovery and maintenance

On the server itself, in the server folder:

```
node server.js reset-password admin
node server.js create-admin janedoe
node server.js list-users
```

Back up by copying the `data` folder, or use Server › Download a backup. To update, stop the server, replace `server.js` and `public/the-architect.html`, and start it again; your data stays.

### Keyboard shortcuts

On a Mac, use Cmd in place of Ctrl. **Help › Keyboard shortcuts** shows the full list.

| Action | Keys |
|---|---|
| Command search (any command, shape, template or theme) | Ctrl+K |
| Claude chat | Ctrl+J |
| Present | F5 |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z |
| Copy, paste, duplicate | Ctrl+C, Ctrl+V, Ctrl+D |
| Select all | Ctrl+A |
| Group / ungroup | Ctrl+G / Ctrl+Shift+G |
| Find and replace | Ctrl+F |
| Save now | Ctrl+S |
| Zoom / fit to screen / 100% | Ctrl+scroll or pinch / Ctrl+0 / Ctrl+1 |
| Pan | Hold Space and drag |
| Move a shape | Arrow keys (Shift for bigger steps) |
| Resize a shape | Alt+arrow keys |
| Add a connected shape | Ctrl+Shift+arrow |
| Move between shapes | Tab / Shift+Tab |
| Select, text, sticky note, connector, rectangle, ellipse, freehand | V, T, S, L, R, O, P |
| Polyline, measure, comment | Y, M, C |
| Snap to 15° while drawing | Hold Shift |
| Turn snapping off while dragging | Hold Alt |
| While presenting | → / ←, L laser, P presenter view, B black screen, Esc exit |

### Troubleshooting and FAQ

| Problem or question | What to do |
|---|---|
| Claude says sign in, or the chat has no Send button | Hosted: open Architect on claude.ai while signed in to Claude, and allow Claude access in the page's Permissions menu. Network: set up the Claude add-in (Working with Claude). |
| I can't reach the server | Check the address with your administrator, make sure you are on the office network or VPN, and that the server is running. |
| I forgot my password | Ask an administrator to reset it. Administrators can run `node server.js reset-password <name>` on the server. |
| Lost my authenticator app | An administrator's password reset also turns off two-step sign-in so you can set it up again. |
| Sign in to Figma or Canva is greyed out | Your administrator hasn't set up Connected apps yet, or you are using the hosted version. Use files, paste or the Figma plugin instead. |
| A .fig file won't open | .fig is Figma's private format. Use the plugin, a Figma link, or Copy as SVG. |
| A .dwg or old .vsd file won't open | Save as DXF (AutoCAD) or .vsdx (Visio) first. |
| A PDF opened as a picture | PDF pages come in as a locked picture with the text as editable boxes on top. For fully editable shapes, export PowerPoint or SVG from the original app. |
| Remove background left marks | It works best on plain or solid backgrounds. Use a picture with a transparent background for busy photos. |
| The intro plays every time | Settings › Intro › First time each day, or Never. |
| I changed something by mistake | Ctrl+Z, the chat's **Undo this**, or File › Version history. |
| Where is my work saved? | The status next to the title says: this browser, your account, the team library or the server. Diagrams saved "in this browser only" are not shared; use Share or Save a copy to keep them safe. |
