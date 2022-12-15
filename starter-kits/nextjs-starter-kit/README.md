# Liveblocks Next.js Starter Kit (beta)

## Features

📄 Documents dashboard with pagination, drafts, groups, auto-revalidation <br>
🗒 Collaborative whiteboard app with fully-featured share menu <br>
🔑 Access can be granted to users, groups, and the public <br>
🆔 Authentication compatible with GitHub, Google, Auth0, and more <br>
✏ Type-safe client & server functions, and everything documented <br>
✅ A great starting point for your collaborative application <br>

## Get started
Get started by running the following command, and running through the instructions, before following the rest of the guide.

```
npx create-liveblocks-app --next
```

## Liveblocks

This starter kit uses [Liveblocks](https://liveblocks.io]) to power its
collaboration. Here's how to get it running.

1. Create an account at [liveblocks.io](https://liveblocks.io])
2. Navigate to the [dashboard](https://liveblocks.io/dashboard) and click "Add
   project..."
3. Create a new project with "Development" as the environment.
4. Go to "API keys" on the side menu, reveal your secret key, and copy it
5. Go to your downloaded starter kit, and enter the file called `.env.local` alongside `package.json` in your project.
6. Place your secret key into the file as `LIVEBLOCKS_SECRET_KEY`.

Liveblocks will now work! Your `.env.local` file should contain a line similar to this:

```
LIVEBLOCKS_SECRET_KEY=sk_dev_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Authentication

The Liveblocks starter kit uses [NextAuth.js](https://next-auth.js.org/) for
authentication, meaning tens of different authentication providers can be used
with your app. A demo authentication system is used by default, but it's easy to
add real providers, such as GitHub, Google, Auth0.

<details>
  <summary>How to set up GitHub authentication</summary>

### GitHub authentication

It's possible to allow users to sign up to your app using GitHub. This is how to
implement it.

#### Getting the secrets

1. Go to [Developer Settings](https://github.com/settings/apps) on GitHub and
   click "New GitHub App"
2. Enter an app name (e.g. `Liveblocks Starter Kit (dev)`). You'll need a new
   app for each environment, so it's helpful to place "dev" in the name.
3. Add a homepage URL—this isn't important now, so a placeholder will do.
4. Find the "Callback URL" input just below, and add your local development URL
   (e.g. `http://localhost:3000`)
5. Look for the "Webhook" section and make sure to uncheck "Active".
6. Use the remaining default settings and press "Create GitHub App"
7. On the next page under "Client secrets", press "Generate a new client
   secret".
8. Copy this secret into the `/.env.local` file as `GITHUB_SECRET`
9. Go back to the previous page and find the "Client ID" near the top. Copy this
   into your `.env.local` file as `GITHUB_ID`

Almost there! `.env.local` should now contain these two lines, along with anything previously there:

```
GITHUB_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GITHUB_ID=XXXXXXXXXXXXXXXXXXXX
```

GitHub authentication is now set up!

</details>

<details>
  <summary>How to set up Auth0 authentication</summary>

### GitHub authentication

It's possible to allow users to sign up to your app using GitHub. This is how to
implement it.

1. Go to your [Auth 0 Dashboard](https://manage.auth0.com/dashboard) and click "Create Application"
2. Enter an app name (e.g. `Liveblocks Starter Kit (dev)`). You'll need a new app for each environment, so it's helpful to place "dev" in the name.
3. Next, select "Single Page Web Applications", and press "Create"
4. Copy your "Client ID" from the top of the page, and place it within `.env.local` as `AUTH0_CLIENT_ID`
5. Click the "Settings" tab—we'll be making a number of changes here.
6. Find the "Client Secret" input field, and copy the value into `.env.local` as `AUTH0_CLIENT_SECRET`
7. Copy your "Domain" from the input field, add "https://" to the start, and place it within `.env.local` as `AUTH0_ISSUER_BASE_URL`
8. Add the following to the "Allowed Callback URLs" textarea: `http://localhost:3000/api/auth/callback/auth0`

9. Add the following to the "Allowed Logout URLs" textarea: `http://localhost:3000`

10. Scroll to the bottom and press "Save changes"

`.env.local` should now contain these three lines, along with anything previously there:

\```
AUTH0_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AUTH0_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AUTH0_ISSUER_BASE_URL=https://XXXXXXXXXXXXXXXXXX.com
\```

Auth0 authentication is now set up! Next, add yourself a user to test out your authentication.
</details>

### How to sign up - add yourself as a user

We haven't set up a database, so we're temporarily using the `/data` folder
instead. Before any user can sign in, they need to be added to `/data/users.ts`.
Navigate there and add your details, for example, if you're signing in with
`yourname@example.com`:

```ts
{
  id: "yourname@example.com",
  name: "Your Name",
  avatar: "https://liveblocks.io/avatars/avatar-0.png",
  groupIds: ["product", "engineering", "design"],
},
```

## Assorted info

### Room vs Document

A `Room` is a Liveblocks format for a collaborative space, whereas a `Document` is your application's custom document type. `Rooms` are converted to `Documents` inside the `/lib/server/documents` functions, ready to be used in the rest of the app.

### Data/error

This starter kit makes extensive use of the following programming pattern for
fetching async resources:

```ts
const { data, error } = await getDocument({
  /* ... */
});

// An error has occured
if (error) {
  // { code: 400, message: "Document not found", suggestion: "Please check the URL is..." }
  console.log(error);
  return;
}

// Success, but result is empty
if (!data) {
  return;
}

// Success

// { name: "my-document", id: "hIas7GuihgHF8Fhv8Sskg",  ... }
console.log(data);
```

### Document functions

Much of the starter kit's power is in the `/lib/server/documents` directory. The
functions in these files allow you to edit your documents easily and return
type-safe objects. For example in an API endpoint:

```ts
import { createDocument } from "../../lib/server";

export default async function (req, res) {
  // Create a new document
  const { data, error } = await createDocument(req, res, {
    name: "My document",
    type: "whiteboard",
    userId: "charlie.layne@example.com",
  });

  // ...
}
```

However, you can also do this from the client too, simply import form the
`/lib/client` folder, and omit `res` and `res` instead. This works by calling an
API endpoint for you, and then calling the `/lib/server` function.

```tsx
import { createDocument } from "../../lib/client";

export function CreateDocumentButton() {
  async function handleCreateDocument() {
    // Create a new document
    const { data, error } = await createDocument({
      name: "My document",
      type: "whiteboard",
      userId: "charlie.layne@example.com",
    });

    // ...
  }

  return <button onClick={handleCreateDocument}>New document</button>;
}
```

For any functions that return data, for example `getDocumentUsers`, which
returns a list of users with access to the room, you can use it with a special
SWR hook that will automatically update your data in your components:

```tsx
// Convert from this
const { data, error } = await getDocumentUsers({
  documentId: "my-document-id",
});

// To this
const { data, error } = useDocumentsFunctionSWR([
  getDocumentUsers,
  {
    documentId: "my-document-id",
  },
]);
```

Here's a working example:

```tsx
import { getDocumentUsers, useDocumentsFunctionSWR } from "../../lib/client";

export function ListUsers() {
  // Get users attached to a document and update every 1000ms
  const { data: users, error: usersError } = useDocumentsFunctionSWR(
    [
      getDocumentUsers,
      {
        documentId: "my-document-id",
      },
    ],
    { refreshInterval: 1000 }
  );

  if (usersError) {
    return <div>Error</div>;
  }

  if (!users) {
    return <div>Loading...</div>;
  }

  return (
    <ul>
      {users.map((user) => (
        <li>user.name</li>
      ))}
    </ul>
  );
}
```

### How to extend the `Document` type

If you'd like to add a new property to `Document`, it's simple. First edit the
`Document` type in `/types/documents.ts`:

```ts
export type Document = {
  // Your new property
  randomNumber: number;

  //...
};
```

Then modify the return value in `/lib/server/utils/buildDocuments.ts`. This is a
function that converts a Liveblocks room into your custom document format:

```ts
// Return our custom Document format
const document: Document = {
  randomNumber: Math.random(),
  // ...
};
```

Next run the following command to check for problems:

```
npm run typecheck
```

And you're good to go! The new property will now be available to use in your app:

 ```tsx
 // 0.91485821,
 console.log(document.randomNumber);
 ```

### How to extend the `User` & `Session` type

Adding a new property to `User`/`Session` is simple. First edit the `User` type
in `/types/data.ts`.

```ts
export type User = {
  // Your new property
  randomNumber: number;

  // ...
};
```

Then make sure to return this new property in `/lib/server/database/getUser.ts`.

```ts
return { randomNumber: Math.random() /* ... */ };
```

The new property will now be available to use in your app:

```tsx
// randomNumber: 0.7091672,
console.log(session.user.info.randomNumber);
```

#### Adding this to your Liveblocks app (optional)

If you'd like your new property to be available inside your Liveblocks app (e.g.
the React hooks used in whiteboard), you must modify `UserInfo` in
`/liveblocks.config.ts`

```tsx
export type UserInfo = Pick<User, "randomNumber" /* ... */>;
```

Then modify `/pages/api/liveblocks/auth.ts`. First we'll give an anonymous user
a property:

```ts
// Anonymous user info
const anonymousUser: User = {
  randomNumber: Math.random(),

  // ...
};
```

Next we'll get the signed in user's property:

```ts
// Get current user info from session (defined in /pages/api/auth/[...nextauth].ts)
// If no session found, this is a logged out/anonymous user
const {
  randomNumber,

  // ...
} = session?.user.info ?? anonymousUser;
```

And then pass this info to `authorize`:

```ts
// Get Liveblocks access token
const { data, error } = await authorize({
  userInfo: { randomNumber /* ... */ },

  // ...
});
```

Done it, great! Make sure to check everything's hooked up correctly:

```
npm run typecheck
```

Once that's working, the new property can then be used in your app:

```tsx
// My random number
const myRandomNumber = useSelf((me) => me.info.randomNumber);

// An array of everyone else's random numbers
const everyonesRandomNumbers = useOthersMapped(
  (other) => other.info.randomNumber
);
```

### Adding a database

To add a database you need to modify the following async functions to return the
correct properties:

- `/lib/server/database/getGroup.ts`
- `/lib/server/database/getGroups.ts`
- `/lib/server/database/getUser.ts`

You can then remove the `/data` folder. Everything else should work correctly.

### Permissions

There are _four_ permission types in the starter kit. _Edit access_ is the maximum permission level you can give to public or team users, but **if you're added as a user (e.g. by email), you can't be given _edit access_, but you can be given _full access_**.

**No access** - `DocumentAccess.NONE`
Can't view the document.
_Available for public permission level._

**Read-only access** - `DocumentAccess.READONLY`
Can only read the document.
_Available for all permission levels._

**Edit access** - `DocumentAccess.EDIT`
Can read & edit the document.
_Only available for public and team level permissions._

**Full access** - `DocumentAccess.FULL`
Can read & edit the document; can invite & delete users; can add & remove teams.
_Only available for user (e.g. email) level permissions._

To sum up—you must be added to the document by id (e.g. by email), and not be set to read-only, to change document permissions.
