import json

from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.tokens import PasswordResetTokenGenerator
#from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm, PasswordChangeForm
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_text
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt


from .forms import SignupForm
from webgis.auth.decorators import login_required


class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return str(user.pk) + str(timestamp) + str(user.email)

token_generator = AccountActivationTokenGenerator()
User = get_user_model()


def _email_context(request, user):
    return {
        "token": token_generator.make_token(user),
        "uid": urlsafe_base64_encode(force_bytes(user.pk)),
        "user": user,
        "site_url": request.build_absolute_uri("/").rstrip("/")
    }

def _get_user_by_uidb64(uidb64):
    try:
        uid = force_text(urlsafe_base64_decode(uidb64))
        return User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None


def check_login_availability(request):
    params = ("username", "email")
    query_params = { param: request.GET[param] for param in params if request.GET.get(param) }
    if len(query_params) == 0:
        return JsonResponse({"available": False}, status=400)
    return JsonResponse({"available": not User.objects.filter(**query_params).exists()})

@csrf_exempt
def create_account(request):
    if request.method != "POST":
        return JsonResponse({"status": 405}, status=405)

    data = None
    if request.content_type.startswith('application/json'):
        data = json.load(request)
    else:
        data = request.POST

    form = SignupForm(data)
    if not form.is_valid():
        return JsonResponse(form.errors, status=400)

    user = form.save(commit=False)
    user.is_active = False
    try:
        user.save()
    except:
        # TODO: better error handling
       return JsonResponse({"status", 400}, status=400)

    subject = "Gisquick Account"
    template_context = _email_context(request, user)
    message = render_to_string("accounts/activation_email.txt", template_context)
    html_message = render_to_string("accounts/activation_email.html", template_context)
    recipient_list = [user.email]
    send_mail(subject, message, settings.EMAIL_HOST_USER, recipient_list, html_message=html_message)
    return JsonResponse({"status": 200})


@csrf_exempt
def activate_account(request, uidb64, token):
    if request.method != "POST":
        return JsonResponse({"status": 405}, status=405)

    user = _get_user_by_uidb64(uidb64)
    if user is None or not token_generator.check_token(user, token):
        return JsonResponse({"status": 400, "error": "Invalid activation uid/token"}, status=400)

    if not user.is_active:
        user.is_active = True
        user.save()
    return JsonResponse({"status": 200})


@csrf_exempt
def request_password_reset(request):
    if request.method != "POST":
        return JsonResponse({"status": 405}, status=405)

    data = None
    if request.content_type.startswith('application/json'):
        data = json.load(request)
    else:
        data = request.POST

    form = PasswordResetForm(data)
    if not form.is_valid():
        return JsonResponse(form.errors, status=400)

    users = list(form.get_users(form.cleaned_data["email"]))
    if not users:
        return JsonResponse({"email": "No active account is associated with given email address."}, status=400)

    subject = "Password Reset"
    for user in users:
        template_context = _email_context(request, user)
        message = render_to_string("accounts/reset_password_email.txt", template_context)
        html_message = render_to_string("accounts/reset_password_email.html", template_context)
        recipient_list = [user.email]
        send_mail(subject, message, settings.EMAIL_HOST_USER, recipient_list, html_message=html_message)
    return JsonResponse({"status": 200})


@csrf_exempt
def new_password(request, uidb64, token):
    if request.method != "POST":
        return JsonResponse({"status": 405}, status=405)

    user = _get_user_by_uidb64(uidb64)
    if user is None or not token_generator.check_token(user, token):
        return JsonResponse({"status": 400, "error": "Invalid activation uid/token"}, status=400)

    data = None
    if request.content_type.startswith('application/json'):
        data = json.load(request)
    else:
        data = request.POST

    form = SetPasswordForm(user, data=data)
    if not form.is_valid():
        return JsonResponse(form.errors, status=400)

    form.save()
    return JsonResponse({"status": 200})


@csrf_exempt
@login_required
def change_password(request):
    if request.method != "POST":
        return JsonResponse({"status": 405}, status=405)

    data = None
    if request.content_type.startswith('application/json'):
        data = json.load(request)
    else:
        data = request.POST
    form = PasswordChangeForm(request.user, data=data)
    if not form.is_valid():
        return JsonResponse(form.errors, status=400)

    user = form.save()
    update_session_auth_hash(request, user)
    return JsonResponse({"status": 200})
