const LINKS = [
  ["home", "Home"],
  ["see", "1 · See"],
  ["model", "2 · Model"],
  ["act", "3 · Act"],
  ["rank", "4 · Rank"],
] as const;

export function Nav() {
  return (
    <nav className="nav">
      <a href="#home" className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Methane Payback
      </a>
      <div className="nav-links">
        {LINKS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
