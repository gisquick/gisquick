from django import forms
from webgis.libs.forms import CaseInsensitiveForm


class JsonpForm(CaseInsensitiveForm):
    callback = forms.CharField(required=True)


class LoginForm(forms.Form):
    username = forms.CharField(required=True)
    password = forms.CharField(required=True)
