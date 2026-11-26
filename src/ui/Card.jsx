import { cardClasses } from "./buttonStyles.js";

/** A rounded panel. `tone`: surface (default), elevated (floating) or accent (violet tint). Renders a section when given a heading id. */
export default function Card({ as: Tag = "div", padding, tone, className, children, ...rest }) {
  return <Tag className={cardClasses({ padding, tone, className })} {...rest}>{children}</Tag>;
}
