import styles from "./Avatar.module.css";

const IMAGE_SIZE = 48;

export function Avatar({ picture }: any) {
  return (
    <div className={styles.avatar}>
      <img
        alt="User avatar"
        src={picture}
        height={IMAGE_SIZE}
        width={IMAGE_SIZE}
        className={styles.avatar_picture}
      />
    </div>
  );
}
