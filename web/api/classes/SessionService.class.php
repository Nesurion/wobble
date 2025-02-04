<?php
class SessionService {
  /**
   *
   */
  public static function signon($session_id, $user_id) {
    SessionService::touch($session_id, $user_id);
  }
  public static function signoff($session_id) {
    NotificationRepository::deleteNotifications($session_id, time() + 100 /* Just somewhere in the future */ );

    $pdo = ctx_getpdo();
    $sql = 'DELETE FROM sessions WHERE session_id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array($session_id));

  }
  public static function touch($session_id, $user_id, $timestamp = FALSE) {
    if ($timestamp === FALSE) {
      $timestamp = time();
    }
    $pdo = ctx_getpdo();
    $stmt = $pdo->prepare('REPLACE sessions (user_id, session_id, last_touch) VALUES(?,?,?)');
    $stmt->bindValue(1, $user_id, PDO::PARAM_INT);
    $stmt->bindValue(2, $session_id, PDO::PARAM_STR);
    $stmt->bindValue(3, $timestamp, PDO::PARAM_INT);
    $stmt->execute();
  }
  public static function getOnlineUserCount() {
    $pdo = ctx_getpdo();
    $r = $pdo->query('SELECT count(distinct user_id) online_users FROM sessions WHERE last_touch > (unix_timestamp() - 5 * 60)')->fetchAll();
    return $r[0]['online_users'];
  }
  public static function getOnlineSessionCount() {
    $pdo = ctx_getpdo();
    $r = $pdo->query('SELECT count(*) online_sessions FROM sessions WHERE last_touch > (unix_timestamp() - 5 * 60)')->fetchAll();
    return $r[0]['online_sessions'];
  }
}