import DefaultLayout from "../components/DefaultLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
  return <DefaultLayout>{children}</DefaultLayout>;
}
