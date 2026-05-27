import { getAnnouncements, getMembers } from "./actions";
import AnnouncementForm from "./announcement-form";
import AnnouncementList from "./announcement-list";

export default async function AnnouncementsPage() {
  const [items, members] = await Promise.all([getAnnouncements(), getMembers()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-6">
      <AnnouncementForm members={members} />
      <AnnouncementList items={items} />
    </div>
  );
}
