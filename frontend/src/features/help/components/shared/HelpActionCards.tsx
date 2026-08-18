import { Link } from "react-router-dom";
import { BookOpen, LifeBuoy, Mail, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/hooks/useRedux";
import { ROLES } from "@/constants/roles";
import { usePublicPlatformSettings } from "@/features/platformSettings";

/**
 * Every card here does something.
 *
 * They previously rendered with `cursor-pointer` and a hover shadow but no
 * handler at all — the strongest possible signal that a click would work,
 * attached to nothing. A card with no destination is now not rendered.
 */

interface HelpActionCard {
  title: string;
  description: string;
  Icon: LucideIcon;
  /** Internal route. */
  to?: string;
  /** External or protocol link (mailto:, tel:). */
  href?: string;
}

const HelpActionCards = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { data } = usePublicPlatformSettings();
  const settings = data?.data;

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const supportSubject = encodeURIComponent(
    `CRM support request from ${user?.email ?? "a user"}`,
  );

  const cards: HelpActionCard[] = [
    {
      title: isSuperAdmin ? "Platform Settings" : "Your Profile",
      description: isSuperAdmin
        ? "Product name, support contacts, retention and defaults."
        : "Update your details, photo, password and theme.",
      Icon: BookOpen,
      to: isSuperAdmin
        ? "/platform/settings"
        : "/profile",
    },
    ...(settings?.supportEmail
      ? [
          {
            title: "Email Support",
            description: settings.supportEmail,
            Icon: Mail,
            href: `mailto:${settings.supportEmail}?subject=${supportSubject}`,
          },
        ]
      : []),
    ...(settings?.supportPhone
      ? [
          {
            title: "Call Support",
            description: settings.supportPhone,
            Icon: LifeBuoy,
            href: `tel:${settings.supportPhone.replace(/\s+/g, "")}`,
          },
        ]
      : []),
  ];

  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {cards.map(({ title, description, Icon, to, href }) => {
        const body = (
          <CardContent className="space-y-3 py-2">
            <Icon className="w-10 h-10 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1 wrap-break-word">
                {description}
              </p>
            </div>
          </CardContent>
        );

        const card = (
          <Card className="h-full hover:shadow-md transition-shadow border-border">
            {body}
          </Card>
        );

        const linkClassName =
          "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

        return to ? (
          <Link className={linkClassName} key={title} to={to}>
            {card}
          </Link>
        ) : (
          <a className={linkClassName} href={href} key={title}>
            {card}
          </a>
        );
      })}
    </div>
  );
};

export default HelpActionCards;
