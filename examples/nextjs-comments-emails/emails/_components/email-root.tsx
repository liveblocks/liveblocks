import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import { emailColors } from "../../tailwind.config";

export function EmailRoot({
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
       * Import shared config here to make common tw classes usable at email's html generation
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
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="py-8">{children}</Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
