# -*- coding: utf-8 -*-

import json

from django.http import HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt

from webgis.mobile import forms


@csrf_exempt
def client_login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        form = forms.LoginForm(data)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(username=username, password=password)
            if user:
                try:
                    login(request, user)
                except Exception, e:
                    print e
                return HttpResponse(status=200)
    logout(request)
    return HttpResponse(status=401)

def client_logout(request):
    logout(request)
    return HttpResponse(status=200)
