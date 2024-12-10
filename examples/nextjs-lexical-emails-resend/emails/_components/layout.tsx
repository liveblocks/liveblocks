import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import { emailColors } from "../_styles/colors";

export function Layout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      {/**
       * This component wraps emails with `TailwindCSS`.
       * Import your shared config here to make common tw classes usable at email's html generation
       * and usable in your code editor.
       */}
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                email: { ...emailColors },
              },
            },
          },
        }}
      >
        <Body className="bg-white my-auto mx-auto font-sans antialiased px-5">
          <Container className="py-8">{children}</Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
