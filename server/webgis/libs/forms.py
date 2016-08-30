from django import forms

def create_case_insensitive_form(base_class):
    class FormClass(base_class):
        def __init__(self, data=None, **kwargs):
            if data:
                data = { k.lower(): v for k, v in data.items() }
            super(FormClass, self).__init__(data=data, **kwargs)

        def _post_clean(self):
            super(FormClass, self)._post_clean()
            keys = list(self.cleaned_data.keys())
            for key in keys:
                value = self.cleaned_data[key]
                del self.cleaned_data[key]
                self.cleaned_data[key.upper()] = value
    return FormClass

CaseInsensitiveForm = create_case_insensitive_form(forms.Form)
CaseInsensitiveModelForm = create_case_insensitive_form(forms.ModelForm)
