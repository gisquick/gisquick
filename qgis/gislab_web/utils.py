# -*- coding: utf-8 -*-
"""
/***************************************************************************
 GIS.lab Web plugin
 Publish your projects into GIS.lab Web application
 ***************************************************************************/
"""

from decimal import Decimal


def to_decimal_array(value):
    """Converts array of numbers or comma-separated string to array of Decimal values.

    Args:
        value (List[float], str): 

    Returns:
        List[Decimal]: array with Decimal numbers
    """
    if isinstance(value, basestring):
        return [Decimal(res_string.strip())for res_string in value.split(',')]
    else:
        return [Decimal(res) for res in value]

def scales_to_resolutions(scales, units, dpi=96):
    """Converts array of map scales to tile resolutions.

    Args:
        scales (List[int]): array of map scales
        units (str): map units name ('feet', 'meters', 'miles', 'degrees')
        dpi (int): optional DPI value

    Returns:
        List[Decimal]: array of computed tile resolutions
    """

    dpi = Decimal(dpi)
    factor = {
        'feet': Decimal('12.0'), 'meters': Decimal('39.37'),
        'miles': Decimal('63360.0'), 'degrees': Decimal('4374754.0')
    }
    return [int(scale)/(dpi*factor[units]) for scale in scales]

def resolutions_to_scales(resolutions, units, dpi=96):
    """Converts array of tile resolutions to map scales.

    Args:
        resolutions (List[Decimal]): array of tile resolutions
        units (str): map units name ('feet', 'meters', 'miles', 'degrees')
        dpi (int): optional DPI value

    Returns:
        List[int]: array of computed map scales
    """
    dpi = Decimal(dpi)
    factor = {
        'feet': Decimal('12.0'), 'meters': Decimal('39.37'),
        'miles': Decimal('63360.0'), 'degrees': Decimal('4374754.0')
    }
    return [int(round(resolution * dpi * factor[units])) for resolution in resolutions]

def opt_value(data, param_name, default_value=''):
    """Helper function for accessing optional nested values in dictionary.

    >>> data = {'meta': {'data': {'value': 'foo'}}}
    >>> opt_value(data, 'meta.data.value', 'default')

    Args:
        data (Dict[str, Any]): data dictionary
        param_name (str): sequence of keys separated with dot '.'
        default_value (Any): default value returned when a given data do not contain
            lookup parameter

    Returns:
        Any: value of given parameter(s) from data dict or default value
    """
    obj = data
    value = default_value
    for param in param_name.split('.'):
        if obj and param in obj:
            value = obj[param]
            obj = value
        else:
            return default_value
    return value