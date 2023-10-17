import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.Header}>
      <div>
        <div className={styles.HeaderLeft}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 180 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M90 0c24.854 0 45 20.147 45 45H45C45 20.147 65.147 0 90 0ZM45 135V45C20.146 45 0 65.147 0 90s20.146 45 45 45Zm90 0V45c24.854 0 45 20.147 45 45s-20.146 45-45 45Zm0 0H45c0 24.853 20.147 45 45 45 24.854 0 45-20.147 45-45Z"
              fill="currentColor"
            />
          </svg>
          <ul>
            <li>
              <a href="#">Product</a>
            </li>
            <li>
              <a href="#">Solutions</a>
            </li>
            <li>
              <a href="#">Community</a>
            </li>
            <li>
              <a href="#">Docs</a>
            </li>
            <li>
              <a href="#">Pricing</a>
            </li>
          </ul>
        </div>
        <button className="button">Get Started</button>
      </div>
    </header>
  );
}
