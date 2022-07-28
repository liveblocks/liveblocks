import { ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "../public/liveblocks.svg";
import iconKey from "../public/icon-key.svg";
import iconChat from "../public/icon-chat.svg";
import iconDocs from "../public/icon-docs.svg";
import iconGithub from "../public/icon-github.svg";
import styles from "../styles/Index.module.css";

const links = [
  { text: "Basic room", href: "/basic" },
  { text: "Interactive canvas", href: "/canvas" },
];

const cards = [
  {
    title: "Get your API key",
    icon: iconKey,
    content: <>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do.</>
  },
  {
    title: "Get your API key",
    icon: iconDocs,
    content: <>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do.</>
  },
  {
    title: "Get your API key",
    icon: iconGithub,
    content: <>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do.</>
  },
  {
    title: "Get support on Discord",
    icon: iconChat,
    content: <>Join our discord server to share projects you{"'"}ve built and find support.</>
  },
];

export default function Index() {
  return (
    <div>
      <main className={styles.main}>
        <Image alt="Liveblocks logo" src={logo} />
        <div className={styles.cards}>
          {cards.map(({ title, icon, content }) => (
            <Card key={title} title={title} icon={icon}>
              {content}
            </Card>
          ))}
        </div>
        <div>
          <CreateRoom />
        </div>
      </main>
    </div>
  );
}

function Card({ children, title, icon }: { children: ReactNode, title: string, icon: string }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon}>
        <Image alt={title} src={icon} />
      </div>
      <div className={styles.cardTitle}>
        {title}
      </div>
      <div className={styles.cardText}>
        {children}
      </div>
    </div>
  );
}

function CreateRoom() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.create}>
      {menuOpen ? (
        <div className={styles.createItems}>
          {links.map(({ text, href }) => (
            <Link key={href} href={href}>
              <a className={styles.createItem}>
                {text}
              </a>
            </Link>
          ))}
        </div>
      ) : null}
      <button
        className={styles.createButton}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className={styles.createIcon}>+</span> Create room
      </button>
    </div>
  );
}
