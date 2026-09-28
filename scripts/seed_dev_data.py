import asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from pwdlib import PasswordHash

from feedio.bootstrap.config import get_settings


async def seed() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    pwd_hasher = PasswordHash.recommended()
    default_pw_hash = pwd_hasher.hash("Password123!")

    now = datetime.now(UTC)

    async with engine.begin() as conn:
        print("Seeding clean dev data...")

        # 1. Users
        admin_id = uuid4()
        support_id = uuid4()
        editor_id = uuid4()
        suspended_id = uuid4()

        await conn.execute(
            text("""
                INSERT INTO users (id, email, password_hash, platform_role, status, email_verified_at, created_at, updated_at)
                VALUES 
                (:admin_id, 'khanhnguyenkim30825@gmail.com', :pw, 'super_admin', 'active', :now, :now - INTERVAL '30 days', :now),
                (:support_id, 'support@feed.io', :pw, 'support', 'active', :now, :now - INTERVAL '20 days', :now - INTERVAL '2 hours'),
                (:editor_id, 'editor@neonframes.com', :pw, 'user', 'active', :now, :now - INTERVAL '15 days', :now - INTERVAL '1 day'),
                (:suspended_id, 'spammer@unverified.xyz', :pw, 'user', 'disabled', :now, :now - INTERVAL '5 days', :now - INTERVAL '5 days')
                ON CONFLICT (email) DO NOTHING;
            """),
            {
                "admin_id": admin_id,
                "support_id": support_id,
                "editor_id": editor_id,
                "suspended_id": suspended_id,
                "pw": default_pw_hash,
                "now": now,
            },
        )

        # 2. Profiles
        await conn.execute(
            text("""
                INSERT INTO user_profiles (id, user_id, display_name, avatar_url, job_title, timezone, locale, created_at, updated_at)
                VALUES
                (gen_random_uuid(), :admin_id, 'Khanh Nguyen', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', 'Platform Administrator', 'Asia/Ho_Chi_Minh', 'en', :now, :now),
                (gen_random_uuid(), :support_id, 'Sarah Jenkins', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80', 'Support Specialist', 'UTC', 'en', :now, :now),
                (gen_random_uuid(), :editor_id, 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', 'Video Editor', 'America/Los_Angeles', 'en', :now, :now),
                (gen_random_uuid(), :suspended_id, 'Suspicious Account', NULL, 'Bot', 'UTC', 'en', :now, :now)
                ON CONFLICT DO NOTHING;
            """),
            {
                "admin_id": admin_id,
                "support_id": support_id,
                "editor_id": editor_id,
                "suspended_id": suspended_id,
                "now": now,
            },
        )

        # 3. Organizations
        org_demo_id = uuid4()
        org_creative_id = uuid4()
        org_neon_id = uuid4()

        await conn.execute(
            text("""
                INSERT INTO organizations (id, name, slug, plan_tier, storage_quota_bytes, status, created_by_user_id, created_at, updated_at)
                VALUES
                (:org_demo_id, 'demo', 'demo-0821e369', 'pro_100gb', 107374182400, 'active', :admin_id, :now - INTERVAL '25 days', :now),
                (:org_creative_id, 'Creative Cut Studio', 'creative-cut-studio', 'enterprise', 1099511627776, 'active', :admin_id, :now - INTERVAL '20 days', :now),
                (:org_neon_id, 'Neon Frames Production', 'neon-frames', 'pro_100gb', 107374182400, 'active', :editor_id, :now - INTERVAL '10 days', :now)
                ON CONFLICT DO NOTHING;
            """),
            {
                "org_demo_id": org_demo_id,
                "org_creative_id": org_creative_id,
                "org_neon_id": org_neon_id,
                "admin_id": admin_id,
                "editor_id": editor_id,
                "now": now,
            },
        )

        # 4. Organization Members
        await conn.execute(
            text("""
                INSERT INTO organization_members (organization_id, user_id, organization_role, status, joined_at)
                VALUES
                (:org_demo_id, :admin_id, 'owner', 'active', :now),
                (:org_creative_id, :admin_id, 'owner', 'active', :now),
                (:org_creative_id, :support_id, 'admin', 'active', :now),
                (:org_neon_id, :editor_id, 'owner', 'active', :now),
                (:org_neon_id, :admin_id, 'member', 'active', :now)
                ON CONFLICT DO NOTHING;
            """),
            {
                "org_demo_id": org_demo_id,
                "org_creative_id": org_creative_id,
                "org_neon_id": org_neon_id,
                "admin_id": admin_id,
                "support_id": support_id,
                "editor_id": editor_id,
                "now": now,
            },
        )

        # 5. Projects
        proj_1 = uuid4()
        proj_2 = uuid4()
        proj_3 = uuid4()

        await conn.execute(
            text("""
                INSERT INTO projects (id, organization_id, created_by_user_id, name, description, visibility, created_at, updated_at)
                VALUES
                (:proj_1, :org_demo_id, :admin_id, 'Commercial Reel 2026', 'Primary portfolio footage cut', 'public', :now, :now),
                (:proj_2, :org_creative_id, :admin_id, 'Feature Documentary', 'Raw cinema rushes', 'public', :now, :now),
                (:proj_3, :org_neon_id, :editor_id, 'Music Video Rough Cut', '4K Multicam sync project', 'public', :now, :now)
                ON CONFLICT DO NOTHING;
            """),
            {
                "proj_1": proj_1,
                "proj_2": proj_2,
                "proj_3": proj_3,
                "org_demo_id": org_demo_id,
                "org_creative_id": org_creative_id,
                "org_neon_id": org_neon_id,
                "admin_id": admin_id,
                "editor_id": editor_id,
                "now": now,
            },
        )

        # 6. Sample Media Assets with storage size
        await conn.execute(
            text("""
                INSERT INTO media_assets (
                    id, organization_id, project_id, created_by_user_id, title, filename,
                    file_size_bytes, mime_type, storage_key, status, duration_seconds,
                    version_group_id, version_number, is_primary_version, created_at, updated_at
                )
                VALUES
                (gen_random_uuid(), :org_demo_id, :proj_1, :admin_id, 'Scene 01 Take 04', 'scene_01_take_04.mp4', 1542880000, 'video/mp4', 'demo/scene_01_take_04.mp4', 'ready', 84.5, gen_random_uuid(), 1, true, :now, :now),
                (gen_random_uuid(), :org_demo_id, :proj_1, :admin_id, 'Color Grade Master', 'color_grade_v2.mov', 4294967296, 'video/quicktime', 'demo/color_grade_v2.mov', 'ready', 180.0, gen_random_uuid(), 1, true, :now, :now),
                (gen_random_uuid(), :org_creative_id, :proj_2, :admin_id, 'Documentary Interview A-Cam', 'interview_a_cam.mp4', 8589934592, 'video/mp4', 'creative/interview_a.mp4', 'ready', 420.0, gen_random_uuid(), 1, true, :now, :now),
                (gen_random_uuid(), :org_neon_id, :proj_3, :editor_id, 'Performance Chorus Cam B', 'chorus_cam_b.mp4', 3221225472, 'video/mp4', 'neon/chorus_b.mp4', 'ready', 145.0, gen_random_uuid(), 1, true, :now, :now)
                ON CONFLICT DO NOTHING;
            """),
            {
                "org_demo_id": org_demo_id,
                "org_creative_id": org_creative_id,
                "org_neon_id": org_neon_id,
                "proj_1": proj_1,
                "proj_2": proj_2,
                "proj_3": proj_3,
                "admin_id": admin_id,
                "editor_id": editor_id,
                "now": now,
            },
        )

        # 7. Subscriptions
        await conn.execute(
            text("""
                INSERT INTO subscriptions (
                    id, organization_id, provider, plan_tier, billing_interval,
                    storage_quota_bytes, status, current_period_start, created_at, updated_at
                )
                VALUES
                (gen_random_uuid(), :org_demo_id, 'stripe', 'pro_100gb', 'yearly', 107374182400, 'active', :now, :now, :now),
                (gen_random_uuid(), :org_creative_id, 'stripe', 'enterprise', 'yearly', 1099511627776, 'active', :now, :now, :now),
                (gen_random_uuid(), :org_neon_id, 'mock', 'pro_100gb', 'monthly', 107374182400, 'active', :now, :now, :now)
                ON CONFLICT DO NOTHING;
            """),
            {
                "org_demo_id": org_demo_id,
                "org_creative_id": org_creative_id,
                "org_neon_id": org_neon_id,
                "now": now,
            },
        )

        # 8. Initial Audit Logs
        await conn.execute(
            text("""
                INSERT INTO audit_logs (id, timestamp, actor_email, actor_role, action, target_type, target_name, details, ip_address, status)
                VALUES
                (gen_random_uuid(), :now - INTERVAL '25 days', 'khanhnguyenkim30825@gmail.com', 'super_admin', 'ORGANIZATION_CREATED', 'organization', 'demo', 'Created workspace demo-0821e369', '127.0.0.1', 'success'),
                (gen_random_uuid(), :now - INTERVAL '20 days', 'khanhnguyenkim30825@gmail.com', 'super_admin', 'USER_ROLE_CHANGED', 'user', 'support@feed.io', 'Promoted account to SUPPORT role', '127.0.0.1', 'success'),
                (gen_random_uuid(), :now - INTERVAL '15 days', 'support@feed.io', 'support', 'STORAGE_QUOTA_INCREASED', 'organization', 'demo', 'Upgraded storage quota to 100 GB via Stripe Pro checkout', '127.0.0.1', 'success'),
                (gen_random_uuid(), :now - INTERVAL '5 days', 'support@feed.io', 'support', 'USER_SUSPENDED', 'user', 'spammer@unverified.xyz', 'Suspended account due to automated bot rate limit abuse', '192.168.1.45', 'success'),
                (gen_random_uuid(), :now - INTERVAL '1 hour', 'khanhnguyenkim30825@gmail.com', 'super_admin', 'STORAGE_QUOTA_INCREASED', 'organization', 'Creative Cut Studio', 'Adjusted enterprise storage capacity to 1 TB', '127.0.0.1', 'success');
            """),
            {"now": now},
        )

        print("Dev database seeded successfully!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
