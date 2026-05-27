import AnnouncementPopup from "@/components/announcement/AnnouncementPopup";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-14">
      {children}
      <AnnouncementPopup />
    </div>
  );
}
