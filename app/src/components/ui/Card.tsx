export default function Card(props: React.HTMLAttributes<HTMLDivElement>) {
    const { className = "", ...rest } = props;
    return <div {...rest} className={`card ${className}`} />;
  }
  