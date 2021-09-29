export default function ListItem({
  label,
  description,
  href,
}: {
  label: string;
  description?: string;
  href?: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="group flex justify-between items-center py-2 px-3.5 bg-white shadow-sm hover:shadow focus:shadow rounded-lg text-black"
      >
        <div>
          <h3 className="font-medium">{label}</h3>

          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>

        <span>&rarr;</span>
      </a>
    </li>
  );
}
