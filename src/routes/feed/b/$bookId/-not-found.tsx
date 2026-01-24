import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconArrowLeft, IconBook } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

export function BookNotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBook />
          </EmptyMedia>
          <EmptyTitle>Book not found</EmptyTitle>
          <EmptyDescription>
            Seems like I haven't read the book you are looking for
          </EmptyDescription>
        </EmptyHeader>
        <Button
          variant="link"
          className="text-muted-foreground"
          size="sm"
          nativeButton={false}
          render={
            <Link to="/feed">
              Back to feed <IconArrowLeft />
            </Link>
          }
        />
      </Empty>
    </div>
  );
}
