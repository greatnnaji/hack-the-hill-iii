import { describe, expect, it } from "vitest";
import { getStory, listStories } from "./stories";

describe("stories", () => {
  it("lists the pipeline stories", async () => {
    const stories = await listStories();
    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), title: expect.any(String) }),
    );
  });

  it("finds a story by id", async () => {
    const [first] = await listStories();
    expect(await getStory(first.id)).toEqual(first);
  });

  it("returns null for an unknown id", async () => {
    expect(await getStory("no-such-story")).toBeNull();
  });
});
