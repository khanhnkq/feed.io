import { describe, expect, it } from "vitest";
import type {
  RealtimeEvent,
  RealtimeMediaCreatedPayload,
  RealtimeMediaDeletedPayload,
  RealtimeMediaMovedPayload,
  RealtimeMediaTranscodedPayload,
  RealtimeMediaUpdatedPayload,
} from "../types";

describe("Project Realtime Event Payload Contracts", () => {
  it("structures media.created event properly", () => {
    const payload: RealtimeMediaCreatedPayload = {
      media: {
        id: "med-1",
        title: "Teaser Cut v1.mp4",
        status: "processing",
      },
      project_id: "proj-1",
      folder_id: "folder-1",
    };

    const event: RealtimeEvent<RealtimeMediaCreatedPayload> = {
      id: "evt-101",
      event_type: "media.created",
      room: "project:proj-1",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("media.created");
    expect(event.room).toBe("project:proj-1");
    expect(event.payload.project_id).toBe("proj-1");
    expect(event.payload.folder_id).toBe("folder-1");
  });

  it("structures media.updated event properly", () => {
    const payload: RealtimeMediaUpdatedPayload = {
      media: {
        id: "med-1",
        title: "Teaser Cut Final.mp4",
      },
      project_id: "proj-1",
    };

    const event: RealtimeEvent<RealtimeMediaUpdatedPayload> = {
      id: "evt-102",
      event_type: "media.updated",
      room: "project:proj-1",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("media.updated");
    expect(event.room).toBe("project:proj-1");
  });

  it("structures media.moved event properly", () => {
    const payload: RealtimeMediaMovedPayload = {
      media: {
        id: "med-1",
      },
      project_id: "proj-1",
      folder_id: "folder-archive",
    };

    const event: RealtimeEvent<RealtimeMediaMovedPayload> = {
      id: "evt-103",
      event_type: "media.moved",
      room: "project:proj-1",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("media.moved");
    expect(event.payload.folder_id).toBe("folder-archive");
  });

  it("structures media.deleted event properly", () => {
    const payload: RealtimeMediaDeletedPayload = {
      media_id: "med-1",
      project_id: "proj-1",
    };

    const event: RealtimeEvent<RealtimeMediaDeletedPayload> = {
      id: "evt-104",
      event_type: "media.deleted",
      room: "project:proj-1",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("media.deleted");
    expect(event.payload.media_id).toBe("med-1");
  });

  it("structures media.transcoded and failed events properly", () => {
    const readyPayload: RealtimeMediaTranscodedPayload = {
      media_id: "med-1",
      project_id: "proj-1",
      status: "ready",
      hls_master_playlist_url: "https://storage.feedio.dev/hls/master.m3u8",
      thumbnail_url: "https://storage.feedio.dev/thumb.jpg",
      duration_seconds: 120.5,
      width: 1920,
      height: 1080,
    };

    const readyEvent: RealtimeEvent<RealtimeMediaTranscodedPayload> = {
      id: "evt-105",
      event_type: "media.transcoded",
      room: "project:proj-1",
      payload: readyPayload,
      created_at: new Date().toISOString(),
    };

    expect(readyEvent.event_type).toBe("media.transcoded");
    expect(readyEvent.payload.status).toBe("ready");
    expect(readyEvent.payload.duration_seconds).toBe(120.5);

    const failedPayload: RealtimeMediaTranscodedPayload = {
      media_id: "med-2",
      project_id: "proj-1",
      status: "failed",
      error: "Corrupt video stream",
    };

    const failedEvent: RealtimeEvent<RealtimeMediaTranscodedPayload> = {
      id: "evt-106",
      event_type: "media.transcode_failed",
      room: "project:proj-1",
      payload: failedPayload,
      created_at: new Date().toISOString(),
    };

    expect(failedEvent.event_type).toBe("media.transcode_failed");
    expect(failedEvent.payload.status).toBe("failed");
    expect(failedEvent.payload.error).toBe("Corrupt video stream");
  });

  it("structures folder events properly", () => {
    const createdEvent: RealtimeEvent = {
      id: "evt-201",
      event_type: "folder.created",
      room: "project:proj-1",
      payload: {
        folder: { id: "f-1", name: "Rough Cuts" },
        project_id: "proj-1",
        parent_id: null,
      },
      created_at: new Date().toISOString(),
    };
    expect(createdEvent.event_type).toBe("folder.created");

    const updatedEvent: RealtimeEvent = {
      id: "evt-202",
      event_type: "folder.updated",
      room: "project:proj-1",
      payload: {
        folder: { id: "f-1", name: "Final Cuts" },
        folder_id: "f-1",
        name: "Final Cuts",
        project_id: "proj-1",
      },
      created_at: new Date().toISOString(),
    };
    expect(updatedEvent.event_type).toBe("folder.updated");

    const movedEvent: RealtimeEvent = {
      id: "evt-203",
      event_type: "folder.moved",
      room: "project:proj-1",
      payload: {
        folder: { id: "f-1", name: "Final Cuts" },
        folder_id: "f-1",
        target_parent_id: "f-root",
        project_id: "proj-1",
      },
      created_at: new Date().toISOString(),
    };
    expect(movedEvent.event_type).toBe("folder.moved");

    const deletedEvent: RealtimeEvent = {
      id: "evt-204",
      event_type: "folder.deleted",
      room: "project:proj-1",
      payload: {
        folder_id: "f-1",
        project_id: "proj-1",
      },
      created_at: new Date().toISOString(),
    };
    expect(deletedEvent.event_type).toBe("folder.deleted");
  });

  it("structures project events properly", () => {
    const updatedEvent: RealtimeEvent = {
      id: "evt-301",
      event_type: "project.updated",
      room: "project:proj-1",
      payload: {
        project: { id: "proj-1", name: "Summer Commercial 2026" },
        project_id: "proj-1",
        organization_id: "org-1",
      },
      created_at: new Date().toISOString(),
    };
    expect(updatedEvent.event_type).toBe("project.updated");

    const deletedEvent: RealtimeEvent = {
      id: "evt-302",
      event_type: "project.deleted",
      room: "project:proj-1",
      payload: {
        project_id: "proj-1",
        organization_id: "org-1",
      },
      created_at: new Date().toISOString(),
    };
    expect(deletedEvent.event_type).toBe("project.deleted");
  });

  it("structures member events properly", () => {
    const projectMembersEvent: RealtimeEvent = {
      id: "evt-401",
      event_type: "project.members_updated",
      room: "project:proj-1",
      payload: {
        project_id: "proj-1",
        user_id: "user-123",
        role: "editor",
        action: "added",
      },
      created_at: new Date().toISOString(),
    };
    expect(projectMembersEvent.event_type).toBe("project.members_updated");
    expect(projectMembersEvent.payload.action).toBe("added");
    expect(projectMembersEvent.payload.role).toBe("editor");

    const orgMembersEvent: RealtimeEvent = {
      id: "evt-402",
      event_type: "organization.members_updated",
      room: "org:org-1",
      payload: {
        organization_id: "org-1",
        user_id: "user-123",
        role: "admin",
        action: "updated",
      },
      created_at: new Date().toISOString(),
    };
    expect(orgMembersEvent.event_type).toBe("organization.members_updated");
    expect(orgMembersEvent.payload.action).toBe("updated");
  });
});
