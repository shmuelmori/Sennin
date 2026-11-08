# Sennin – Upgrade Specification: Topic-Based Feed

## 1. Goal

Replace manual channel selection with a long, dynamic list of topics. Each day the app draws 20 topics from the list and fetches 5 English Shorts for each topic. This keeps the feed varied and independent of channels found in advance.

## 2. Summary of changes

| Area | Today | After the upgrade |
| --- | --- | --- |
| Video source | Hand-picked channels | YouTube search by topic |
| Topics | 2 fixed topics | Hundreds of items in the DB, a dynamic list that can be added to and removed from |
| Sources tab | Channel management | Replaced by a Topics tab |
| Feed info strip | Channel name and title | Item name, title and a remove button |
| Feed size | 15 plus reserve | 100 (20 items × 5) plus reserve |
| Fetch cost | Under 100 units | About 2,010 units |

## 3. Concepts

- **Item:** one topic in the list. It can be specific ("octopus", "iron", "Claude Code") or broad ("sea creatures"). The item is the unit that is drawn, searched and removed.
- **No hierarchy:** there are no topics and subtopics, neither in the UI nor in the DB. All items are equal and live in one flat list.
- **Removed item:** an item marked for removal. It does not take part in the draw and can be restored.

## 4. The item list

- The list is dynamic and stored in the `item` table in SQLite. The DB is its single source of truth.
- Each item has an ID, a name and an English search query.
- **Initial list (seed):** a script that runs once, on the app's first launch when the table is empty, and inserts hundreds of items into the DB. After that it never runs again and has no other role.
- The initial list has to be stored somewhere inside the app, so it is a plain data file (`db/seed.json`) that only the script reads.
- Most items in the initial list are small and specific (octopus, iron, black holes), because a specific search returns more focused videos.

## 5. Topics tab (replaces Sources)

**Display**

- One flat list of all items, both the built-in ones and the ones the user added, sorted alphabetically.
- A removed item is shown in grey with a "Restore" button.
- At the top of the screen: a search bar to filter the list, and an active-out-of-total counter.

**Adding**

- A + button at the right end of the header.
- Tapping it opens a text box with an "Add" button.
- Several items can be entered separated by commas, e.g. "black holes, volcanoes, octopus".
- Input processing: trim whitespace, ignore empty values, and skip duplicates case-insensitively.
- The search query of a new item is the text that was typed.
- A short message: how many were added and how many were skipped as duplicates.
- Any item, regardless of its origin, can be deleted completely with a swipe, after confirmation.

## 6. The feed

- The info strip above the video: the item name (e.g. "Octopus"), with the title below it. The channel name is dropped.
- A small remove button at the side of the strip.
- Tapping the remove button marks the item as removed and shows a message with "Undo" for 5 seconds.
- The removal applies from the next fetch. Videos of the item already in today's feed stay.
- Feed order: videos are shuffled so that two videos of the same item never appear in a row.
- All other behaviors stay: full screen, vertical scrolling, three recycled players, skip on error, replacement from the reserve, marking "watched" after half the video, and a video that restarts when it ends.

## 7. The fetch process

### 7.1 Drawing items

- Draw 20 distinct items from the active (not removed) items.
- The draw is weighted: an item that has never been drawn has weight 30. Any other item's weight is the number of days since it was last drawn, up to a maximum of 30. An item drawn today gets weight 0.
- If there are fewer than 20 active items, take all of them.

### 7.2 Search per item

One `search.list` call per item:

| Parameter | Value |
| --- | --- |
| q | The search query plus a suffix |
| type | video |
| videoDuration | short |
| relevanceLanguage | en |
| safeSearch | moderate |
| maxResults | 25 |
| order | Rotates by pickCount: relevance, viewCount, date |

- The suffix rotates by pickCount: explained, facts, how, why.
- Varying the suffix and order ensures that an item drawn again returns different videos.

### 7.3 Filtering

1. Remove videos that were already watched, are already in the feed, or appear in the results of more than one item.
2. Call `videos.list` (snippet, contentDetails, statistics, status, player) in batches of 50.
3. The existing rules, in order: not a live stream, up to 3 minutes, vertical, embeddable, no blocked words, at least 1,000 views (does not apply to videos from the last 48 hours).
4. New rule: a word from the search query appears in the title, description or tags.
5. Log the rejection reason for every video.

### 7.4 Selection

- For each item: the 5 videos that passed, sorted by views.
- Videos that passed but were not selected go into the reserve, up to 20 in total.
- An item that returned fewer than 5 videos: take as many as there are, and don't replace it with another item.
- Update `lastPickedAt` and `pickCount` of every drawn item.

## 8. Quota and timing

- Fetch cost: 20 × 100 for search plus about 10 for videos, about 2,010 units in total out of 10,000 per day.
- The daily feed is stored in SQLite. Opening the app shows the stored feed without fetching.
- Fetching is still manual, via the button in the Refresh tab.
- A daily unit counter that resets at midnight Pacific Time (like YouTube's quota).
- If fewer than 2,100 units remain, the button is disabled and a message is shown.
- A quotaExceeded error mid-fetch: stop, keep the previous feed and log the error.

## 9. Fetch report (Refresh and Status)

- Fetch time and duration.
- The items drawn, and for each item: how many results, how many passed and how many were selected.
- Rejections by rule.
- Units used in the fetch, and units remaining today.
- Items that returned 0 videos are flagged.

## 10. Data model

| Table | Fields | Change |
| --- | --- | --- |
| item | id, name, query, removed, removedAt, lastPickedAt, pickCount, createdAt | New, one flat list |
| feed\_item | position, videoId, itemId, itemName, title, durationSec, isReserve, status | channelId and channelTitle replaced by itemId and itemName |
| watched | videoId, watchedAt | Unchanged |
| fetch\_log | startedAt, durationMs, itemsPicked, fetched, passed, rejectedByRule, quotaUsed, error | Added fields |
| quota\_day | date, unitsUsed | New |

The topic, channel and channel\_topic tables are dropped. The migration drops them and keeps watched.

## 11. Out of scope

- A hierarchy of topics and subtopics.
- Editing the name or search query of an existing item.
- Automatic background fetching.
- Additional search languages.

## 12. Acceptance criteria

- [ ] The Topics tab shows all items in one list, with search and a counter
- [ ] Adding several comma-separated items works, including skipping duplicates
- [ ] A removed item is not drawn in later fetches, and can be restored
- [ ] The remove button in the feed works, including "Undo"
- [ ] The info strip shows the item name instead of the channel name
- [ ] A fetch draws 20 items and returns up to 100 videos
- [ ] No two videos of the same item in a row
- [ ] No repeated videos across fetches
- [ ] A fetch costs less than 2,100 units
- [ ] The button is disabled when there isn't enough quota
