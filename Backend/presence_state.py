from collections import defaultdict

# Maps socket session id -> user id
_sid_to_user: dict[str, str] = {}

# Maps user id -> set of active socket session ids
_user_sids: dict[str, set[str]] = defaultdict(set)


def mark_user_online(sid: str, user_id: str) -> None:
    user_id = str(user_id)
    previous_user = _sid_to_user.get(sid)
    if previous_user and previous_user != user_id:
        _user_sids.get(previous_user, set()).discard(sid)
        if not _user_sids.get(previous_user):
            _user_sids.pop(previous_user, None)
    _sid_to_user[sid] = user_id
    _user_sids[user_id].add(sid)


def mark_user_offline_by_sid(sid: str) -> str | None:
    user_id = _sid_to_user.pop(sid, None)
    if not user_id:
        return None
    _user_sids.get(user_id, set()).discard(sid)
    if not _user_sids.get(user_id):
        _user_sids.pop(user_id, None)
    return user_id


def is_user_online(user_id: str) -> bool:
    return bool(_user_sids.get(str(user_id)))
