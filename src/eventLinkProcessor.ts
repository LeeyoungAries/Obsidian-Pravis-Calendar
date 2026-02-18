import type { MarkdownPostProcessorContext } from "obsidian";

export function createEventLinkProcessor(onEventClick: (eventId: string) => void) {
  return (el: HTMLElement, _ctx: MarkdownPostProcessorContext) => {
    const links = el.querySelectorAll('a.internal-link[href*="event:"]:not(.calendar-event-link)');
    links.forEach((a) => {
      const href = (a.getAttribute("href") ?? "").replace(/^#/, "");
      const m = href.match(/event:([a-zA-Z0-9_]+)/);
      const eventId = m ? m[1] : "";
      if (!eventId) return;
      a.addClass("calendar-event-link");
      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onEventClick(eventId);
      }, true);
    });
  };
}
