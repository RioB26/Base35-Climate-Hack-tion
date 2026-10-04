import foliage from "../../assets/home/foliage.webp";

/** Decorative framing stays out of the reading order and cannot intercept clicks. */
export function HomeFoliage() {
  return (
    <div className="home-foliage" aria-hidden="true">
      <img className="home-leaves home-leaves-top" src={foliage} alt="" width={1536} height={1024} />
      <img className="home-leaves home-leaves-left" src={foliage} alt="" width={1536} height={1024} />
      <img className="home-leaves home-leaves-right" src={foliage} alt="" width={1536} height={1024} />
    </div>
  );
}
