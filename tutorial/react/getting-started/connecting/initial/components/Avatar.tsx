const IMAGE_SIZE = 32;

export function Avatar({ picture }: any) {
  return (
    <div className="avatar">
      <img
        alt="User avatar"
        src={picture}
        height={IMAGE_SIZE}
        width={IMAGE_SIZE}
        className="avatar_picture"
      />
    </div>
  );
}
