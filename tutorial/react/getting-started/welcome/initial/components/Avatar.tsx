const IMAGE_SIZE = 32;

export function Avatar({ avatar }: { avatar: string }) {
  return (
    <div className="avatar">
      <img
        alt="User avatar"
        src={avatar}
        height={IMAGE_SIZE}
        width={IMAGE_SIZE}
        className="avatar_picture"
      />
    </div>
  );
}
