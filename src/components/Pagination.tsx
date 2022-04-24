import { ReactNode } from "react";
import PaginationButtons from "./PaginationButtons";

export type PaginationProps<T> = {
  title: string;
  next?: T;
  action?: (offset: T) => void;
  loading?: boolean;
  children: ReactNode;
};

const Pagination = (props: PaginationProps<any>) => {
  const { children, action, next, loading } = props;

  return (
    <>
      {children}
      <PaginationButtons
        text="MORE"
        action={action}
        offset={next}
        loading={loading}
      />
    </>
  );
};

export default Pagination;
