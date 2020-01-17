
def get_user_data(user):
    if user.is_authenticated:
        return {
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name(),
            'email': user.email,
            'is_guest': False,
            'is_superuser': user.is_superuser
        }
    return {
        'username': 'guest',
        'first_name': '',
        'last_name': '',
        'full_name': 'guest',
        'email': '',
        'is_guest': True,
        'is_superuser': False
    }
