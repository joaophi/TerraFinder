import s from "./PaginationButtons.module.scss";

type Props = {
  text: string;
  action?: (offset: number) => void;
  offset?: number;
  loading?: boolean;
};

const PaginationButtons = ({ text, action, offset, loading }: Props) =>
  offset ? (
    <div className={s.component}>
      {renderAction(text, offset, action, loading)}
    </div>
  ) : (
    <></>
  );

export default PaginationButtons;

const renderAction = (
  children: string,
  offset: number | undefined,
  action: ((offset: number) => void) | undefined,
  loading?: boolean
) => (
  <button
    onClick={() => action && offset && action(offset)}
    className={s.button}
    disabled={loading}
  >
    {loading ? "Loading..." : children}
  </button>
);
