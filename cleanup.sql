-- Clean up everything first
DROP TABLE IF EXISTS game_invitations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TRIGGER IF EXISTS update_user_activity_trigger ON users;
DROP FUNCTION IF EXISTS update_user_activity();
DROP FUNCTION IF EXISTS mark_offline_users();
DROP FUNCTION IF EXISTS cleanup_expired_invitations();
