type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost";
  };
  export default function Button({ variant = "primary", className = "", ...props }: Props) {
    const cls = `${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`;
    return <button {...props} className={cls} />;
  }
  