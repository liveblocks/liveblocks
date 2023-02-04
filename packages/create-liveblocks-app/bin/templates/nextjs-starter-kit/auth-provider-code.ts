export const demoAuthProvider = `
    // CredentialsProvider is used for the demo auth system
    // Replace this with a real provider, e.g. GitHub, Auth0
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "email",
          type: "text",
        },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const a = [1, 2];

        const user: User | null = await getUser(credentials.email);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.id,
          image: user.avatar,
        };
      },
    }),
`;

export const githubAuthProvider = `
    // Use GitHub authentication
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
`;

export const auth0AuthProvider = `
    // Use Auth0 authentication
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID as string,
      clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
    }),
`;
