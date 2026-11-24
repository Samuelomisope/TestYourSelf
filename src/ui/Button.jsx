import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { buttonClasses } from "./buttonStyles.js";

/**
 * The app's button. Use `to` for navigation (renders a link) and `onClick` for actions.
 * `loading` disables the button, shows a spinner and tells screen readers it is busy.
 */
const Button = forwardRef(function Button(
  { variant, size, block, className, loading = false, disabled = false, to, href, type = "button", children, ...rest },
  ref,
) {
  const classes = buttonClasses({ variant, size, block, className });
  const content = (
    <>
      {loading && <FontAwesomeIcon icon={faSpinner} spin aria-hidden="true" />}
      {children}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={classes} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={classes} {...rest}>{content}</a>;
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

export default Button;
